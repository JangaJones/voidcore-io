import type { CalculationResult, LootItem, LootSource, Rating, SpecComparisonResult } from "../data/types";
import { formatPercentFromRatio, formatSourceType } from "../lib/format";
import { ItemCard } from "./ItemCard";

interface SourceRowProps {
  source: LootSource;
  items: LootItem[];
  result?: CalculationResult;
  comparison?: SpecComparisonResult;
  getItemRating: (itemId: number) => Rating;
  getItemCatalystState: (item: LootItem) => "inactive" | "active-nice" | "active-bis" | "overridden";
  onRateItem: (itemId: number, rating: Rating) => void;
  onToggleItemRemoved: (itemId: number, removed: boolean) => void;
  getItemSpecLabels: (item: LootItem) => string[];
}

export function SourceRow(props: SourceRowProps): JSX.Element {
  const { source, items, result, comparison, getItemRating, getItemCatalystState, onRateItem, onToggleItemRemoved, getItemSpecLabels } = props;
  const hasBestGain = (comparison?.deltaExactBisChance ?? 0) > 0.0001;
  const deltaNiceChance =
    comparison && comparison.currentResult && comparison.bestResult
      ? comparison.bestResult.niceOrBetterValueChance - comparison.currentResult.niceOrBetterValueChance
      : 0;
  const hasNiceGain = deltaNiceChance > 0.0001;
  const sourceContextLabel =
    source.type === "mythicPlus"
      ? "Mythic+ Dungeon"
      : source.type === "raid"
        ? source.instanceName ?? "Raid"
        : formatSourceType(source.type);
  const lootPoolValue = result ? (result.denominator > 0 ? String(result.denominator) : "0 (No valid loot pool)") : "0";
  const removedItemsValue = result ? String(result.removedCount) : "0";
  const hasBetterAlternativeSpec =
    !!comparison &&
    comparison.bestSpecId !== comparison.currentSpecId &&
    comparison.currentResult !== null &&
    comparison.bestResult !== null &&
    (hasBestGain || hasNiceGain);

  const formatSignedPercent = (value: number): string => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

  return (
    <section className="panel-angled overflow-hidden">
      <div className="grid gap-3 md:grid-cols-[340px_1fr]">
        <aside className="border-b border-slate-700/80 p-4 md:border-b-0 md:border-r">
          <h3 className="font-display text-lg text-midnight-silver">{source.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-midnight-cyan">{sourceContextLabel}</p>

          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
            <dt className="text-midnight-muted">Voidcore Cost</dt>
            <dd className="font-semibold text-midnight-silver">{source.bonusRollCost}</dd>
            <dt className="text-midnight-muted">Loot Pool</dt>
            <dd className="font-semibold text-midnight-silver">{lootPoolValue}</dd>
            <dt className="text-midnight-muted">Removed Items</dt>
            <dd className="font-semibold text-midnight-silver">{removedItemsValue}</dd>
          </dl>

          {comparison && comparison.currentResult && comparison.bestResult && (
            <div
              className={`mt-3 border p-3 ${
                hasBetterAlternativeSpec
                  ? "border-emerald-400/70 bg-emerald-950/22"
                  : "border-cyan-500/45 bg-slate-950/45"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm font-semibold uppercase tracking-wider ${
                    hasBetterAlternativeSpec ? "text-emerald-200" : "text-midnight-cyan"
                  }`}
                >
                  Spec Comparison
                </p>
              </div>

              <div
                className={`mt-2 border p-2.5 ${
                  hasBetterAlternativeSpec ? "border-emerald-400/75 bg-emerald-900/30" : "border-cyan-500/40 bg-slate-900/45"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-midnight-muted">Better Loot Specialization</p>
                <p className={`mt-0.5 text-base font-semibold ${hasBetterAlternativeSpec ? "text-emerald-100" : "text-cyan-100"}`}>
                  {hasBetterAlternativeSpec ? comparison.bestSpecName ?? "N/A" : comparison.currentSpecName}
                </p>
              </div>

              <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-midnight-muted">Current & Best Comparison</p>

              <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                <div
                  className={`border p-2.5 ${
                    hasBetterAlternativeSpec
                      ? "border-rose-400/50 bg-rose-950/22"
                      : "border-cyan-500/35 bg-slate-900/40"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-midnight-muted">{comparison.currentSpecName}</p>
                  <p className="mt-1 text-sm font-semibold text-midnight-silver">
                    BiS {formatPercentFromRatio(comparison.currentResult.exactBisChance)}
                  </p>
                  <p className="text-sm text-midnight-muted">
                    Nice+ {formatPercentFromRatio(comparison.currentResult.niceOrBetterValueChance)}
                  </p>
                  <p className="text-sm text-midnight-muted">
                    Item Amount: {comparison.currentResult.denominator}
                  </p>
                </div>

                <div
                  className={`border p-2.5 ${
                    hasBetterAlternativeSpec
                      ? "border-emerald-400/75 bg-emerald-900/28"
                      : "border-cyan-500/35 bg-slate-900/40"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-midnight-muted">{comparison.bestSpecName ?? "N/A"}</p>
                  <p className="mt-1 text-sm font-semibold text-midnight-silver">
                    BiS {formatPercentFromRatio(comparison.bestResult.exactBisChance)}
                  </p>
                  <p className="text-sm text-midnight-muted">
                    Nice+ {formatPercentFromRatio(comparison.bestResult.niceOrBetterValueChance)}
                  </p>
                  <p className="text-sm text-midnight-muted">
                    Item Amount: {comparison.bestResult.denominator}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-xs text-midnight-muted">
                {hasBetterAlternativeSpec
                  ? `Switching to ${comparison.bestSpecName} improves BiS by ${formatSignedPercent(
                      comparison.deltaExactBisChance
                    )} and Nice+ by ${formatSignedPercent(deltaNiceChance)} for this source.`
                  : "Current specialization is already optimal for this source (no better BiS/Nice+ odds from switching)."}
              </p>
            </div>
          )}

          {comparison && comparison.bisExclusiveItems.length > 0 && (
            <div className="mt-2 border border-amber-400/45 bg-amber-950/20 p-2 text-xs text-amber-100">
              {comparison.bisExclusiveItems.slice(0, 2).map((entry) => (
                <p key={entry.itemId}>
                  BiS {entry.itemName} is exclusive to {entry.availableSpecNames.join(", ")}.
                </p>
              ))}
              {comparison.bisExclusiveItems.length > 2 && <p>+{comparison.bisExclusiveItems.length - 2} more exclusive BiS items.</p>}
            </div>
          )}
        </aside>

        <div className="p-3 md:p-4">
          {items.length === 0 ? (
            <div className="border border-slate-700/75 bg-slate-950/40 p-4 text-sm text-midnight-muted">
              No items available for this source with the current visual filters.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ItemCard
                  key={String(item.id)}
                  item={item}
                  rating={getItemRating(item.id)}
                  catalystState={getItemCatalystState(item)}
                  onRatingChange={(rating) => onRateItem(item.id, rating)}
                  onToggleRemoved={(removed) => onToggleItemRemoved(item.id, removed)}
                  availableSpecNames={getItemSpecLabels(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
