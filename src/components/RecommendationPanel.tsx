import type { ContentFilter, RecommendationResult, RecommendationSortMode } from "../data/types";
import { formatPercentFromRatio } from "../lib/format";

interface RecommendationPanelProps {
  recommendation: RecommendationResult;
  selectedSpecName: string;
  onSortModeChange: (mode: RecommendationSortMode) => void;
  recommendationContentFilter: ContentFilter;
  onRecommendationContentFilterChange: (value: ContentFilter) => void;
}

export function RecommendationPanel(props: RecommendationPanelProps): JSX.Element {
  const {
    recommendation,
    selectedSpecName,
    onSortModeChange,
    recommendationContentFilter,
    onRecommendationContentFilterChange
  } = props;
  const slots = Array.from({ length: 3 }, (_, index) => recommendation.topRecommendations[index] ?? null);

  return (
    <section className="panel-angled p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-midnight-silver">Recommendation Summary</h2>
          <p className="mt-1 text-sm text-midnight-muted">
            Sorted per voidcore cost. Raid rolls cost 2 voidcores; Mythic+ rolls cost 1.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-widest text-midnight-muted">Content</span>
            <select
              className="control-input min-w-[140px] py-1.5 text-sm"
              value={recommendationContentFilter}
              onChange={(event) => onRecommendationContentFilterChange(event.target.value as ContentFilter)}
            >
              <option value="all">All</option>
              <option value="mythic-plus">Mythic+</option>
              <option value="raid">Raid</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              className={`btn-arcane ${recommendation.sortMode === "bis" ? "border-amber-300/70 text-amber-100" : ""}`}
              onClick={() => onSortModeChange("bis")}
            >
              Sort for Best In Slot
            </button>
            <button
              type="button"
              className={`btn-arcane ${recommendation.sortMode === "nice" ? "border-emerald-300/70 text-emerald-100" : ""}`}
              onClick={() => onSortModeChange("nice")}
            >
              Sort for Nice To Have
            </button>
          </div>
        </div>
      </div>

      <p className="mt-2 text-sm text-midnight-muted">
        Ratings are based on your played spec profile ({selectedSpecName}) and applied across candidate loot specs in-class.
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {slots.map((result, index) => (
          <article key={result ? `${result.sourceId}-${result.specId}` : `empty-${index}`} className="border border-slate-700/80 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wider text-midnight-cyan">Top {index + 1}</p>
            {result ? (
              <>
                <p className="mt-1 font-display text-lg text-midnight-silver">
                  {result.sourceName} · {result.specName}
                </p>

                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-midnight-muted">BiS Odds / Roll</dt>
                  <dd>
                    {formatPercentFromRatio(result.exactBisChance)} ({result.counts.bis}/{result.denominator})
                  </dd>

                  <dt className="text-midnight-muted">Nice+ Odds / Roll</dt>
                  <dd>
                    {formatPercentFromRatio(result.niceOrBetterValueChance)} ({result.counts.nice + result.counts.bis}/{result.denominator})
                  </dd>

                  <dt className="text-midnight-muted">Unlucky Odds / Roll</dt>
                  <dd>
                    {formatPercentFromRatio(result.unluckyChance)} ({result.counts.ignore}/{result.denominator})
                  </dd>

                  <dt className="text-midnight-muted">BiS Odds / Voidcore</dt>
                  <dd>{formatPercentFromRatio(result.perVoidcoreExactBisChance)}</dd>

                  <dt className="text-midnight-muted">Nice+ Odds / Voidcore</dt>
                  <dd>{formatPercentFromRatio(result.perVoidcoreNiceOrBetterChance)}</dd>

                  <dt className="text-midnight-muted">Voidcore Cost</dt>
                  <dd>{result.bonusRollCost}</dd>
                </dl>
              </>
            ) : (
              <div className="mt-3 flex min-h-[170px] items-center justify-center border border-dashed border-slate-700/85 bg-slate-950/25">
                <p className="text-sm uppercase tracking-wider text-midnight-muted">Empty Slot</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
