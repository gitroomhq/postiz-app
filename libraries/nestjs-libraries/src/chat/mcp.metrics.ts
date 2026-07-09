import { INestApplication, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { MCPServer } from '@mastra/mcp';
import { PerformanceObserver, constants } from 'perf_hooks';
import v8 from 'v8';

const MB = 1024 * 1024;
const logger = new Logger('McpMetrics');

// `@mastra/mcp` stores one transport per streamable-HTTP session in
// `streamableHTTPTransports` and only removes it on `transport.onclose`, which
// fires only on an explicit client DELETE. That map is the leak.
//
// Its sibling `httpServerInstances` is not worth reporting: it stays empty in
// v1.4.1, written under `if (transport.sessionId)` before the id is assigned.
// The per-session Server still leaks, retained via the transport's closures.
//
// Everything here is read-only. We never touch the map, only observe it.
type SessionMaps = {
  streamableHTTPTransports?: Map<string, unknown>;
};

// heapUsed sampled at an arbitrary moment is dominated by uncollected garbage.
// Sampling right after a major GC gives the *retained* heap, which is what a
// leak actually is. The observer costs one callback per GC, no forced pauses.
let retainedHeap = 0;

const observeMajorGc = () => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const kind = (entry as unknown as { detail?: { kind?: number } }).detail
        ?.kind;
      if (kind === constants.NODE_PERFORMANCE_GC_MAJOR) {
        retainedHeap = process.memoryUsage().heapUsed;
      }
    }
  });
  observer.observe({ entryTypes: ['gc'] });
};

export const startMcpMetrics = (app: INestApplication, server: MCPServer) => {
  const maps = server as unknown as SessionMaps;
  const transports = () => maps.streamableHTTPTransports;

  logger.log(
    `V8 heap limit: ${Math.round(
      v8.getHeapStatistics().heap_size_limit / MB
    )} MB`
  );

  if (!transports()) {
    logger.warn(
      'Cannot read streamableHTTPTransports from MCPServer — @mastra/mcp internals changed, session metrics disabled'
    );
    return;
  }

  observeMajorGc();

  const intervalMs = Number(process.env.MCP_METRICS_INTERVAL_MS || 900_000);
  const abandonedAfterMs = Number(
    process.env.MCP_METRICS_ABANDONED_MS || 3_600_000
  );

  // Session id -> first time we saw it. Two orders of magnitude smaller than
  // the ~76 KB transport it tracks, and pruned whenever a session does close.
  const firstSeen = new Map<string, number>();
  let previous = new Set<string>();
  let createdTotal = 0;
  let closedTotal = 0;
  let lastRetained = 0;

  const sample = () => {
    const live = new Set(transports()!.keys());
    const now = Date.now();

    let created = 0;
    for (const id of live) {
      if (!previous.has(id)) {
        created++;
        firstSeen.set(id, now);
      }
    }

    let closed = 0;
    for (const id of previous) {
      if (!live.has(id)) {
        closed++;
        firstSeen.delete(id);
      }
    }

    let abandoned = 0;
    for (const seen of firstSeen.values()) {
      if (now - seen > abandonedAfterMs) {
        abandoned++;
      }
    }

    previous = live;
    createdTotal += created;
    closedTotal += closed;

    return { live: live.size, created, closed, abandoned };
  };

  const snapshot = () => {
    const mem = process.memoryUsage();
    return {
      liveSessions: transports()!.size,
      createdTotal,
      closedTotal,
      retainedHeapMb: Math.round(retainedHeap / MB),
      heapUsedMb: Math.round(mem.heapUsed / MB),
      heapTotalMb: Math.round(mem.heapTotal / MB),
      externalMb: Math.round(mem.external / MB),
      rssMb: Math.round(mem.rss / MB),
      heapLimitMb: Math.round(v8.getHeapStatistics().heap_size_limit / MB),
      uptimeSeconds: Math.round(process.uptime()),
    };
  };

  setInterval(() => {
    const { live, created, closed, abandoned } = sample();

    // Idle service: nothing opened, nothing closed, nothing held. Say nothing.
    if (!live && !created && !closed) {
      return;
    }

    // Retained heap only means anything once a major GC has actually run.
    const deltaMb = lastRetained
      ? Math.round((retainedHeap - lastRetained) / MB)
      : 0;
    const perSessionKb =
      created > 0 && lastRetained
        ? Math.round((retainedHeap - lastRetained) / 1024 / created)
        : null;
    const ratePerHour = Math.round(created / (intervalMs / 3_600_000));
    lastRetained = retainedHeap;

    const heapPart = retainedHeap
      ? `retainedHeap=${Math.round(retainedHeap / MB)}MB delta=${
          deltaMb >= 0 ? '+' : ''
        }${deltaMb}MB`
      : 'retainedHeap=pending(no major gc yet)';

    // rss/heapTotal/external bridge to the container's memory graph, which
    // counts the whole process rather than just the V8 heap:
    //   rss - heapTotal - external ~= native overhead (code, stacks, metadata)
    const mem = process.memoryUsage();

    logger.log(
      `mcp-sessions live=${live} new=${created} closed=${closed} ` +
        `abandoned>${Math.round(abandonedAfterMs / 60_000)}m=${abandoned} ` +
        `rate=${ratePerHour}/h ${heapPart}` +
        (perSessionKb === null ? '' : ` perSession~${perSessionKb}KB`) +
        ` rss=${Math.round(mem.rss / MB)}MB heapTotal=${Math.round(
          mem.heapTotal / MB
        )}MB external=${Math.round(mem.external / MB)}MB`
    );
  }, intervalMs).unref();

  const token = process.env.MCP_METRICS_TOKEN;
  app.use('/mcp-metrics', (req: Request, res: Response) => {
    if (!token || req.headers.authorization !== `Bearer ${token}`) {
      res.sendStatus(404);
      return;
    }

    if (req.query.gc && typeof global.gc === 'function') {
      global.gc();
    }

    res.json(snapshot());
  });
};
