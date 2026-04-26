import type { SpecComparisonResult } from "../data/types";
import { formatPercentFromRatio } from "../lib/format";

interface SpecComparisonTableProps {
  rows: SpecComparisonResult[];
}

function renderResult(value: number | null): string {
  if (value === null) {
    return "No valid loot pool";
  }

  return formatPercentFromRatio(value);
}

export function SpecComparisonTable({ rows }: SpecComparisonTableProps): JSX.Element {
  return (
    <section className="panel-angled overflow-hidden">
      <header className="border-b border-slate-700/80 p-4">
        <h2 className="font-display text-lg text-midnight-silver">Spec Comparison By Source</h2>
        <p className="mt-1 text-sm text-midnight-muted">
          Current spec is compared against the best loot spec in the same class only. Cross-class comparisons are disabled.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-slate-900/80 text-midnight-muted">
            <tr>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Source</th>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Current BiS</th>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Current Unlucky</th>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Best Spec</th>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Best BiS</th>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Best Unlucky</th>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Delta BiS</th>
              <th className="border-b border-slate-700/70 px-3 py-2 text-left">Delta Unlucky</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sourceId} className="odd:bg-slate-900/35 even:bg-slate-950/35">
                <td className="border-b border-slate-800/90 px-3 py-2">{row.sourceName}</td>
                <td className="border-b border-slate-800/90 px-3 py-2">
                  {renderResult(row.currentResult ? row.currentResult.exactBisChance : null)}
                </td>
                <td className="border-b border-slate-800/90 px-3 py-2">
                  {renderResult(row.currentResult ? row.currentResult.unluckyChance : null)}
                </td>
                <td className="border-b border-slate-800/90 px-3 py-2">
                  {row.bestSpecName ?? "N/A"}
                  {row.bestResult?.isDefaultProfile && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-amber-300">default profile</span>
                  )}
                </td>
                <td className="border-b border-slate-800/90 px-3 py-2">
                  {renderResult(row.bestResult ? row.bestResult.exactBisChance : null)}
                </td>
                <td className="border-b border-slate-800/90 px-3 py-2">
                  {renderResult(row.bestResult ? row.bestResult.unluckyChance : null)}
                </td>
                <td className="border-b border-slate-800/90 px-3 py-2">
                  {row.bestResult && row.currentResult ? formatPercentFromRatio(row.deltaExactBisChance) : "N/A"}
                </td>
                <td className="border-b border-slate-800/90 px-3 py-2">
                  {row.bestResult && row.currentResult ? formatPercentFromRatio(row.deltaUnluckyChance) : "N/A"}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-midnight-muted" colSpan={8}>
                  No sources available for comparison.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
