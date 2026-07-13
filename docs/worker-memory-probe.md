# Worker memory probe

Read-only instrumentation to find out **where** the Worker (orchestrator)
container's memory actually lives. It changes no behaviour: it logs one line a
minute and nothing else.

## Why

Railway shows the Worker stepping 5 → 15 GB, then 16.6 → 18.3 GB, and Worker 2
climbing to 22.6 GB before dropping to 7.8 GB (probably a kernel OOM kill). The
steps are fast, permanent, and happen at **0.2–0.8 vCPU** — something grabs many
gigabytes while doing almost no work, and never gives them back.

Several mutually exclusive explanations fit the RSS graph equally well, and no
amount of further log-reading distinguishes them. This probe does, in one
number.

## The number that matters

```
native = rss - jsHeap(ALL isolates) - external
```

`rss` is what the cgroup limit is enforced against and what OOM-kills the
container, but it is a total — it cannot say *which* allocator holds the pages.
Splitting it can.

### Why `jsHeap` must count every thread (a bug this probe used to have)

`process.memoryUsage().heapUsed` reports the **current isolate only** — the main
thread. Temporal runs workflows in `worker_threads`, each with its own V8
isolate, and the orchestrator registers ~30 Temporal Workers.

Measured: **a worker thread allocating 312 MB moved main-thread `heapUsed` by
0 MB.** All 312 MB appeared in `native`.

So the naive `rss - heapUsed - external` silently lumps the *workflow threads'
heaps* in with *Temporal core's Rust buffers* — and those two have completely
different fixes (bound `maxCachedWorkflows` vs cap activity admission). The
probe therefore sums every isolate via `process.report.getReport().workers[]`
(~25–38 ms with 30 threads; negligible once a minute) and reports:

- `jsHeapMain` — the main isolate
- `jsHeapThreads` — **the workflow threads**, where the sticky workflow cache lives
- `jsHeap` — the sum, which is what `native` subtracts
- `threads` — isolate count, so the above can be sanity-checked

## Result → conclusion

Run for at least one full `:00` scheduled-post burst (ideally 24h, to catch a
step). Then:

| What climbs during a `:00` burst | Conclusion | Next action |
| --- | --- | --- |
| **`native` climbs; `jsHeap`, `external`, `arrayBuffers` stay flat** | Memory is in **Temporal core's Rust buffers** — admitted activity-task payloads. The worker is pulling the whole backlog into RAM instead of leaving it in the Temporal server. Confirms the leading hypothesis; rules out every JS-side theory. | Cap the `main` queue: it has `maxConcurrentActivityTaskExecutions: 1000000` (`temporal.module.ts:41,75`) and `WORKER_CONCURRENCY_DIVIDER` is never applied to it. |
| **`jsHeapThreads` climbs** | Memory is the **Temporal sticky workflow cache** (it lives in the workflow threads' isolates). **The old probe would have mislabelled this as `native` and sent you to cap the wrong thing.** | Set an explicit `maxCachedWorkflows` — the default is ~1082 *per Worker*, each computed as if it owned the machine. |
| **`external` / `arrayBuffers` climb with RSS** | Memory is **Buffers** — media downloads or `sharp`/`convertToJPEG`. The leading hypothesis is wrong. | Per-queue media caps, a global media-buffer semaphore, and move `convertToJPEG` (`posts.service.ts:378-405`) to ingest time. |
| **`jsHeapMain` climbs** | Memory is the **main isolate** — retained activity contexts / payloads on the Nest side. | Heap snapshot; hunt retained references. |
| **Everything falls back after the burst, but `rss` stays high** | **Allocator high-water mark.** glibc is not returning freed pages. This is what turns a transient spike into a permanent floor and eventually into the OOM kill. | Set `MALLOC_ARENA_MAX=2` and `MALLOC_MMAP_THRESHOLD_=131072` as Railway variables (no code change). |
| **`rss` climbs steadily with no burst and never falls** | A genuine **leak**, not burst-driven. Nothing in `context.md` explains this shape for the Worker. | Heap snapshot with `--heapsnapshot-near-heap-limit=1`; restart the investigation. |

Rows 1 and 5 are **not exclusive** — the likeliest real answer is both at once:
core admits far too much work, and glibc never gives the memory back afterwards.

## Caveats when reading the output

- **`native` is meaningless on macOS.** macOS under-reports RSS (memory
  compression), so `heapUsed` can exceed `rss` and `native` goes negative. The
  probe flags this with `rss=UNRELIABLE(negative-native;macOS?)`. It should
  never appear on Linux/Railway. Local runs are still useful for the *heap*
  numbers, just not for `native`.
- **`threadScan=FAILED`** means the per-isolate scan threw and `jsHeap` is
  main-thread only — treat `native` as inflated by the workflow threads' heaps.
- **`heapLimit` is per isolate**, not a process-wide ceiling. See below.

## Enabling

Railway service variables, on the Worker (and optionally the Backend, which has
its own separate MCP-session leak):

```
MEMORY_PROBE=true
MEMORY_PROBE_SERVICE=worker-1     # or worker-2 / backend — tags each line
MEMORY_PROBE_INTERVAL_MS=1800000  # optional; default is 15 min
```

Off unless `MEMORY_PROBE=true`. Requires a redeploy to take effect — which
resets RSS, so allow a full day before drawing conclusions.

### Why 15 minutes (not 60s)

- **Cost.** A sample costs **~140 ms with 34 isolates**, because
  `process.report.getReport()` walks every worker thread. That is an event-loop
  block on the orchestrator's main thread. At 15 min it is **0.016%** of
  wall-clock; at 60 s it would be 0.23%. There is no reason to pay 15× for
  resolution we do not need.
- **Resolution.** We are chasing a memory **step** that then plateaus for
  **hours** (5 → 15 GB, then flat for 14 h). 15 min places a step against a
  `:00` posting burst comfortably — and it makes a 25,000-line log export span
  **weeks** instead of a day.

Set `MEMORY_PROBE_INTERVAL_MS=30000` to watch it live locally. Don't go below
~60 s in production.

## Container test (2026-07-13) — VERIFIED against Railway's base image

**This module** (compiled with the repo's flags), run in `node:22.20-bookworm-slim`
under a real cgroup v2 memory limit — as close to Railway as we can get locally.
No database or Temporal server needed: 33 worker threads stand in for the
Temporal workflow threads.

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# compile this module with the same flags the orchestrator builds with
npx tsc libraries/nestjs-libraries/src/telemetry/memory.probe.ts \
  --outDir /tmp/probe --module commonjs --target ES2022 --esModuleInterop \
  --skipLibCheck --types node

# harness.js: require('./memory.probe.js'), startMemoryProbe(), spawn 33 Workers
docker run --rm --memory=8g -v /tmp/probe:/app:ro -w /app \
  node:22.20-bookworm-slim node harness.js
```

Results (the real module, not a replica):

```
[mem] probe started service=orchestrator interval=2000ms cgroupLimit=8192MB heapLimit=2096MB (per isolate) nodeOptions=null
[mem] service=orchestrator rss=43  jsHeap=4   jsHeapMain=4 jsHeapThreads=0   threads=1  external=2 native=37  heapLimit=2096
[mem] service=orchestrator rss=464 jsHeap=250 jsHeapMain=5 jsHeapThreads=246 threads=34 external=2 native=212 heapLimit=2096
```

| Check | Result |
| --- | --- |
| cgroup limit read | ✅ `8192MB` — the `/sys/fs/cgroup` path works on cgroup v2 |
| `native` sign | ✅ positive (the negative-`native` macOS artifact does not occur on Linux) |
| isolate count | ✅ `threads=34`, and `jsHeapThreads` correctly attributes the 33 threads' heaps |
| probe cost | ⚠️ **~140 ms** with 34 isolates — ~4× the macOS figure. At a 60 s interval that is 0.23% of wall-clock and far below any Temporal timeout, but it **is** an event-loop block. **Do not lower the interval below 60 s.** |

Separately verified: `process.report.getReport()` does **not** block on busy
worker threads (20–25 ms even with threads spinning in tight CPU loops), so the
probe cannot stall the orchestrator.

### The heap limit is ~2 GB regardless of container size

| Container | `heap_size_limit` per isolate | default `maxCachedWorkflows` |
| --- | --- | --- |
| 4 GB | 2096 MB | 1110 |
| 16 GB | 2096 MB | 1110 |
| 24 GB | 2096 MB | 1110 |

Node caps the V8 heap at ~2 GB for any large container. **Worker threads get the
same 2096 MB** (Temporal passes no `resourceLimits`). The `4144 MB` seen on a Mac
is an artifact of running uncontainerized — ignore it.

**This bounds the whole JS heap at ~5 GB** (main thread 2096 + `main`'s workflow
thread 2096 + 32 idle threads ≈ 960), and exceeding any isolate would print a V8
`FATAL`, which production never shows. So the 18 GB **cannot** be JS heap — it is
native. See `context.md` → "READ THIS FIRST".

## Platform compatibility (checked 2026-07-13)

- **`process.memoryUsage()` and `v8.getHeapStatistics()`** are plain Node APIs
  with no special privileges. They work in any container or microVM and Railway
  cannot restrict them. The only Node restriction found for Railway is the
  `--expose-gc` **CLI flag**, which this probe does not use.
- **The `/sys/fs/cgroup` read is best-effort and never throws.** It handles
  cgroup v2 namespaced, cgroup v2 *not* namespaced (resolving the nested path
  from `/proc/self/cgroup` and walking up), and cgroup v1 — and returns
  `unknown` if none are readable. On macOS it logs `cgroupLimit=unknown`, which
  is expected, not a failure. **Not yet verified against a real Linux container**
  (no Docker on the dev machine); if it prints `unknown` on Railway, the probe
  still works — only the ceiling figure is missing, and that can be read off the
  Railway dashboard instead.

## Watch `heapLimit` on the first deployed line

`context.md` asserts that with `NODE_OPTIONS` unset, Node 22 caps the V8 heap at
**~2 GB** in a large container, and that claim has been used to argue "18 GB of
RSS cannot be heap." **It has never been verified on Railway, and it is already
shaky**: on the (uncontainerized) dev machine V8 chose a **4144 MB** limit, not
2048 MB.

Combined with the fact that `heapLimit` is **per isolate** and the orchestrator
runs ~30 Temporal Workers, the total heap ceiling across the process is far
higher than the "2 GB" the earlier reasoning relied on. The first `[mem] probe
started` line on Railway settles the actual number. Read it before trusting any
argument that depends on it.

## Where it runs, and how much it logs

**One probe per PROCESS**, started from `main.ts` after `app.listen()`.

"Worker" is ambiguous in this system — the probe runs per *container*, not per
Temporal Worker:

| "Worker" | Count | One probe each? |
| --- | --- | --- |
| Railway **Worker service** = a container running the orchestrator | 2 (worker 1, worker 2) | ✅ yes |
| Temporal **`Worker`** = an in-process task-queue poller | **33 per container** | ❌ no |

A per-Temporal-Worker probe would be meaningless: all 33 share one process, one
RSS, one set of isolates. The probe measures the **whole process** (`rss` is
process-wide; `jsHeap` sums all 34 isolates).

**Volume at the 15-minute default: 96 lines/day per process**, plus one
`probe started` banner at boot.

| Enabled on | Lines/day |
| --- | --- |
| both orchestrator containers | 192 |
| + backend | 288 |

Trivial against a 25,000-line export — which will now span **weeks**.

### Every line identifies its own process

```
[mem] service=worker pid=1 replica=1a2b3c4d rss=… jsHeap=… …
```

- `service` — from `MEMORY_PROBE_SERVICE`, falling back to Railway's own
  `RAILWAY_SERVICE_NAME`, so the tag is right even if you never set it.
- `replica` — first 8 chars of `RAILWAY_REPLICA_ID`. **This matters:** a Railway
  service can run several replicas and they all share the same env vars, so
  `service` alone cannot tell them apart. We still do not know whether the Jul 9
  memory cliff was the whole service dying or one replica — this is how you find
  out.
- `pid` — fallback identity anywhere Railway's vars are absent.

## Reading the output

Every line is prefixed `[mem]`, so it greps cleanly out of a 25,000-line export:

```
[mem] probe started service=worker-1 interval=60000ms cgroupLimit=32768MB heapLimit=2048MB (per isolate) nodeOptions=null
[mem] service=worker-1 rss=4821 jsHeap=1204 jsHeapMain=612 jsHeapThreads=592 threads=31 external=143 arrayBuffers=38 native=3474 heapLimit=2048
```

All values are MB. `cgroupLimit` is read from the cgroup and answers a still-open
question: what the Worker's real ceiling is (Worker 2 peaked at 22.62 GB — if the
limit is 24 GB, that was the ceiling).

Watch **`native` vs `jsHeapThreads`** across a `:00` burst. That is the
experiment, and the distinction between them is the whole point.

## Baseline data point (local dev, idle, 2026-07-13)

```
[mem] service=orchestrator rss=1797 heapUsed=546 heapTotal=647 external=60 arrayBuffers=43 native=1191
```

At **idle**, at boot, doing no work: RSS 1797 MB, of which 1191 MB (66%) was
neither main-thread JS heap nor Buffers. This was taken with the *old* probe, so
that 1191 MB includes the ~30 workflow threads' isolates — which is precisely the
ambiguity the current probe resolves. Re-take this baseline with the new build
before drawing conclusions.

The local echo of production's 3–5 GB idle baseline is real either way: ~30
Temporal Workers in one process is not free.
