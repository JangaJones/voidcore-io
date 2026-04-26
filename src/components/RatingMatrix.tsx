import type { CalculationResult, ContentFilter, LootItem, LootSource, Rating, SpecComparisonResult } from "../data/types";
import { SourceRow } from "./SourceRow";

interface RatingMatrixProps {
  sources: LootSource[];
  itemsBySource: Record<string, LootItem[]>;
  sourceResultsById: Record<string, CalculationResult | undefined>;
  comparisonBySourceId: Record<string, SpecComparisonResult | undefined>;
  contentFilter: ContentFilter;
  onContentFilterChange: (value: ContentFilter) => void;
  getItemRating: (itemId: number) => Rating;
  getItemCatalystState: (item: LootItem) => "inactive" | "active-nice" | "active-bis" | "overridden";
  onRateItem: (itemId: number, rating: Rating) => void;
  onToggleItemRemoved: (itemId: number, removed: boolean) => void;
  getItemSpecLabels: (item: LootItem) => string[];
}

export function RatingMatrix(props: RatingMatrixProps): JSX.Element {
  const {
    sources,
    itemsBySource,
    sourceResultsById,
    comparisonBySourceId,
    contentFilter,
    onContentFilterChange,
    getItemRating,
    getItemCatalystState,
    onRateItem,
    onToggleItemRemoved,
    getItemSpecLabels
  } = props;

  return (
    <section className="flex flex-col gap-3">
      <div className="panel-angled p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg text-midnight-silver">Item Rating</h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-widest text-midnight-muted">Content</span>
            <select
              className="control-input min-w-[140px] py-1.5 text-sm"
              value={contentFilter}
              onChange={(event) => onContentFilterChange(event.target.value as ContentFilter)}
            >
              <option value="all">All</option>
              <option value="mythic-plus">Mythic+</option>
              <option value="raid">Raid</option>
            </select>
          </label>
        </div>
        <p className="mt-1 text-sm text-midnight-muted">
          Default rating is Ignore Item. Click card to cycle rating, click the Voidcore in the card to remove the item from loot pool.<br />
          Removed items are class-wide across specs, stay visible, and are excluded from all denominator/chance math.
        </p>
      </div>

      {sources.length === 0 && (
        <section className="panel-angled p-4">
          <p className="text-sm text-midnight-muted">No sources match the active content filter.</p>
        </section>
      )}

      {sources.map((source) => (
        <SourceRow
          key={source.id}
          source={source}
          items={itemsBySource[source.id] ?? []}
          result={sourceResultsById[source.id]}
          comparison={comparisonBySourceId[source.id]}
          getItemRating={getItemRating}
          getItemCatalystState={getItemCatalystState}
          onRateItem={onRateItem}
          onToggleItemRemoved={onToggleItemRemoved}
          getItemSpecLabels={getItemSpecLabels}
        />
      ))}
    </section>
  );
}
