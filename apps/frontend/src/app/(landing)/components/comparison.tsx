/**
 * Comparison — server component
 * Spec: Section 4 — competitor table with highlighted BB Post column
 */
import { COMPARISON_ROWS, type ComparisonRow } from '../data/landing';

const COMPETITORS = ['BB Post', 'Buffer', 'Later', 'Postiz'] as const;

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <svg className="w-5 h-5 text-[#22C55E] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Yes">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="No">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return <span className="font-semibold text-white">{value}</span>;
}

export function Comparison() {
  return (
    <section className="py-20 md:py-28 bg-[#1A1919]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          More platform. More power. Less price.
        </h2>

        <div className="overflow-x-auto mt-12 rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="bg-[#0E0E0E] border-b border-white/[0.08]">
                <th className="text-left p-4 text-gray-400 text-sm font-medium w-48">
                  Feature
                </th>
                {COMPETITORS.map((name) => {
                  const isBB = name === 'BB Post';
                  return (
                    <th
                      key={name}
                      className={`p-4 text-sm font-semibold ${
                        isBB
                          ? 'text-white bg-[#8B5CF6]/10 border-x border-[#8B5CF6]/30'
                          : 'text-gray-400'
                      }`}
                    >
                      {name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row: ComparisonRow) => (
                <tr
                  key={row.feature}
                  className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-4 text-gray-300 text-sm">{row.feature}</td>
                  <td className="p-4 text-center text-sm bg-[#8B5CF6]/5 border-x border-[#8B5CF6]/20">
                    <CellValue value={row.bbpost} />
                  </td>
                  <td className="p-4 text-center text-sm text-gray-400">
                    <CellValue value={row.buffer} />
                  </td>
                  <td className="p-4 text-center text-sm text-gray-400">
                    <CellValue value={row.later} />
                  </td>
                  <td className="p-4 text-center text-sm text-gray-400">
                    <CellValue value={row.postiz} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6 italic">
          BB Post is the only open-source social scheduler with AI content, full
          automation, and a free plan — all in one product.
        </p>
      </div>
    </section>
  );
}
