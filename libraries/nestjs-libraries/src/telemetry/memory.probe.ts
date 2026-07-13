// Namespace imports so this module does not depend on `esModuleInterop` being
// set — it is inherited from tsconfig.base.json today, but a probe should not
// break the orchestrator's boot if that ever changes.
import * as v8 from 'v8';
import { readFileSync } from 'fs';

/**
 * Read-only memory probe. Logs one line per interval and changes no behaviour.
 *
 * It exists to answer a single question about the Worker's 5 -> 15 -> 18 GB
 * memory steps: WHERE does the resident memory actually live? RSS is what the
 * cgroup limit is enforced against (and what OOM-kills the container), but RSS
 * on its own cannot distinguish between the candidate causes. The split can:
 *
 *   native = rss - jsHeap(ALL threads) - external
 *
 * See docs/worker-memory-probe.md for the result -> conclusion table.
 *
 * WHY jsHeap COUNTS ALL THREADS
 * -----------------------------
 * `process.memoryUsage().heapUsed` reports the CURRENT isolate only — the main
 * thread. Temporal runs workflows in worker_threads, each with its own V8
 * isolate, and the orchestrator registers ~30 Temporal Workers. Those isolates'
 * heaps are invisible to `heapUsed` (measured: a worker thread allocating
 * 312 MB moved main-thread `heapUsed` by 0 MB).
 *
 * So a naive `rss - heapUsed - external` lumps the workflow threads' heaps in
 * with Temporal core's Rust buffers, and the two have completely different
 * fixes (bound `maxCachedWorkflows` vs cap activity admission). We therefore
 * sum every isolate via process.report.getReport().workers[], which costs
 * ~25-38 ms with 30 threads — negligible once a minute.
 */

const MB = 1024 * 1024;

/** Parses one cgroup limit file. Null when absent, unlimited, or unparseable. */
function readLimitFile(path: string): number | null {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8').trim();
  } catch {
    // Not Linux (macOS dev), or the file is not exposed in this container.
    return null;
  }

  // cgroup v2 writes the literal "max" when unlimited.
  if (raw === 'max') {
    return null;
  }

  const bytes = Number(raw);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  // cgroup v1 reports a near-2^63 sentinel when unlimited. Anything above a
  // terabyte is that sentinel, not a real container limit.
  if (bytes > 1024 * 1024 * MB) {
    return null;
  }

  return Math.round(bytes / MB);
}

/**
 * The container's real memory ceiling. Null if it cannot be determined.
 *
 * Copes with three layouts, because we do not control (or fully know) how the
 * platform runs the container:
 *
 *   1. cgroup v2, namespaced — the container's limit is at the root of its
 *      view: /sys/fs/cgroup/memory.max
 *   2. cgroup v2, NOT namespaced — that path is then the HOST root cgroup and
 *      reads "max". The real limit lives at the nested path named in
 *      /proc/self/cgroup. Without this branch we report "unknown" for a
 *      container that does have a limit.
 *   3. cgroup v1 — /sys/fs/cgroup/memory/memory.limit_in_bytes
 *
 * Never throws: a probe must not be able to take the process down.
 */
function cgroupLimitMb(): number | null {
  const v2 = readLimitFile('/sys/fs/cgroup/memory.max');
  if (v2 !== null) {
    return v2;
  }

  try {
    const self = readFileSync('/proc/self/cgroup', 'utf8');
    // cgroup v2 format is a single line: "0::/the/path"
    const line = self.split('\n').find((l) => l.startsWith('0::'));
    let rel = line?.slice(3).trim();

    while (rel && rel !== '/') {
      const nested = readLimitFile(`/sys/fs/cgroup${rel}/memory.max`);
      if (nested !== null) {
        return nested;
      }
      rel = rel.slice(0, rel.lastIndexOf('/')) || '/';
    }
  } catch {
    // fall through to v1
  }

  return readLimitFile('/sys/fs/cgroup/memory/memory.limit_in_bytes');
}

type ThreadHeaps = {
  /** Live JS heap across EVERY isolate (main + each worker thread), in MB. */
  jsHeapAll: number;
  /** The main isolate alone, in MB. */
  jsHeapMain: number;
  /** Worker-thread isolates only — Temporal's workflow threads live here. */
  jsHeapThreads: number;
  /** Isolate count (1 = main only). */
  threads: number;
  /** False when the per-thread scan failed and jsHeapAll is main-only. */
  complete: boolean;
};

/** Sums the live JS heap across all isolates. Never throws. */
function threadHeaps(mainHeapUsedMb: number): ThreadHeaps {
  try {
    const report: any = process.report?.getReport();
    const workers: any[] = Array.isArray(report?.workers) ? report.workers : [];

    const used = (n: any) => Number(n?.javascriptHeap?.usedMemory ?? 0) / MB;
    const main = used(report) || mainHeapUsedMb;
    const threads = workers.reduce((sum, w) => sum + used(w), 0);

    return {
      jsHeapAll: Math.round(main + threads),
      jsHeapMain: Math.round(main),
      jsHeapThreads: Math.round(threads),
      threads: workers.length + 1,
      complete: true,
    };
  } catch {
    // Degrade to main-thread-only rather than lose the whole sample.
    return {
      jsHeapAll: mainHeapUsedMb,
      jsHeapMain: mainHeapUsedMb,
      jsHeapThreads: 0,
      threads: 1,
      complete: false,
    };
  }
}

export function sampleMemory() {
  const m = process.memoryUsage();
  const rss = m.rss / MB;
  const external = m.external / MB;
  const heaps = threadHeaps(Math.round(m.heapUsed / MB));

  // Everything resident that is neither a V8 heap nor a Buffer. Temporal
  // core's Rust allocations and glibc arena slack land here.
  const native = rss - heaps.jsHeapAll - external;

  return {
    rss: Math.round(rss),
    jsHeapAll: heaps.jsHeapAll,
    jsHeapMain: heaps.jsHeapMain,
    jsHeapThreads: heaps.jsHeapThreads,
    threads: heaps.threads,
    heapTotal: Math.round(m.heapTotal / MB),
    external: Math.round(external),
    arrayBuffers: Math.round(m.arrayBuffers / MB),
    native: Math.round(native),
    // Per isolate. NOT a process-wide ceiling — see the header comment.
    heapLimit: Math.round(v8.getHeapStatistics().heap_size_limit / MB),
    complete: heaps.complete,
    // macOS under-reports RSS (memory compression), so heapUsed can exceed it
    // and `native` can go negative. Harmless locally, but the number is
    // meaningless when this is set. Should never be true on Linux/Railway.
    rssUnreliable: native < 0,
  };
}

/**
 * Starts the probe. Returns a stop function.
 *
 * `service` tags the line so Worker 1 / Worker 2 / backend are separable when
 * the logs are exported and grepped.
 *
 * Default interval is 15 MINUTES. Two reasons, both measured:
 *
 *   COST — a sample costs ~140 ms with 34 isolates (measured in-container),
 *   because process.report.getReport() walks every worker thread. That is an
 *   event-loop block on the orchestrator's main thread. At 15 min it is 0.016%
 *   of wall-clock; at 60 s it would be 0.23%. No reason to pay 15x for
 *   resolution we do not need.
 *
 *   RESOLUTION — we are chasing a memory STEP that then plateaus for HOURS
 *   (5 -> 15 GB, then flat for 14 h). 15 min is ample to place a step against a
 *   `:00` posting burst, and it makes a 25,000-line log export span weeks
 *   instead of a day.
 *
 * Override with MEMORY_PROBE_INTERVAL_MS (e.g. 30000) to watch it live locally.
 * Do not go below ~60s in production.
 */
export function startMemoryProbe(service: string, intervalMs = 15 * 60_000) {
  const limit = cgroupLimitMb();
  const first = sampleMemory();

  // Identify WHICH process emitted the line. A Railway service can run several
  // replicas, and they all share the same env vars — so `service` alone cannot
  // tell them apart. That matters: we still do not know whether the Jul 9 memory
  // cliff was the whole service dying or a single replica. Railway injects
  // RAILWAY_REPLICA_ID per replica; `pid` is the fallback for anywhere else.
  const replica = (
    process.env.RAILWAY_REPLICA_ID ||
    process.env.RAILWAY_DEPLOYMENT_ID ||
    ''
  ).slice(0, 8);
  const who =
    `service=${service} pid=${process.pid}` +
    (replica ? ` replica=${replica}` : '');

  console.log(
    `[mem] probe started ${who} interval=${intervalMs}ms ` +
      `cgroupLimit=${limit === null ? 'unknown' : `${limit}MB`} ` +
      `heapLimit=${first.heapLimit}MB (per isolate) ` +
      `nodeOptions=${JSON.stringify(process.env.NODE_OPTIONS ?? null)}`
  );

  const tick = () => {
    const s = sampleMemory();
    // Single line, prefixed so it greps cleanly out of a 25k-line export:
    //   grep '^\[mem\]' logs.json
    console.log(
      `[mem] ${who} rss=${s.rss} ` +
        `jsHeap=${s.jsHeapAll} jsHeapMain=${s.jsHeapMain} ` +
        `jsHeapThreads=${s.jsHeapThreads} threads=${s.threads} ` +
        `external=${s.external} arrayBuffers=${s.arrayBuffers} ` +
        `native=${s.native} heapLimit=${s.heapLimit}` +
        (s.complete ? '' : ' threadScan=FAILED') +
        (s.rssUnreliable ? ' rss=UNRELIABLE(negative-native;macOS?)' : '')
    );
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  // Never hold the process open on the probe's account.
  timer.unref?.();

  return () => clearInterval(timer);
}
