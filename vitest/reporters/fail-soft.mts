/**
 * Wrap a reporter so that nothing it does can fail the test run.
 *
 * The ReportPortal agent queues its HTTP work internally, but an unreachable
 * endpoint still surfaces as a throw out of a lifecycle hook or an unhandled
 * rejection. A self-hosted ReportPortal being down must degrade to "no RP
 * data", never to "CI red" - the JUnit XML artifact is the fallback record.
 */
export function failSoft<T extends object>(reporter: T, label = 'reportportal'): T {
  return new Proxy(reporter, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return (...args: unknown[]) => {
        try {
          const result = (value as (...a: unknown[]) => unknown).apply(target, args);

          if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
            return Promise.resolve(result).catch((error: unknown) => {
              console.warn(`[${label}] ${String(prop)}() failed, ignoring:`, error);
            });
          }

          return result;
        } catch (error) {
          console.warn(`[${label}] ${String(prop)}() failed, ignoring:`, error);
          return undefined;
        }
      };
    },
  });
}
