import type { CatalystItemDefinition, CatalystRating } from "../data/types";
import { getWowheadItemTooltip, refreshWowheadTooltips } from "../lib/wowhead";
import { sortByGlobalSlotOrder } from "../lib/slot-order";

interface CatalystPanelProps {
  entries: CatalystItemDefinition[];
  getSlotRating: (slotKey: string) => CatalystRating;
  onCycleSlotRating: (slotKey: string) => void;
}

function formatSlot(slot: string): string {
  return slot.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getButtonClass(rating: CatalystRating): string {
  if (rating === "bis") {
    return "border-amber-300/70 bg-amber-900/25 text-amber-100";
  }

  if (rating === "nice") {
    return "border-emerald-300/65 bg-emerald-900/20 text-emerald-100";
  }

  return "border-slate-600/70 bg-slate-950/45 text-midnight-muted";
}

function getLabel(rating: CatalystRating): string {
  if (rating === "bis") return "Best In Slot";
  if (rating === "nice") return "Nice To Have";
  return "Ignored";
}

export function CatalystPanel({ entries, getSlotRating, onCycleSlotRating }: CatalystPanelProps): JSX.Element | null {
  const setEntries = sortByGlobalSlotOrder(entries.filter((entry) => entry.catalystTierType === "set"));
  const offSetEntries = sortByGlobalSlotOrder(entries.filter((entry) => entry.catalystTierType === "off-set"));

  if (entries.length === 0) {
    return null;
  }

  const renderEntry = (entry: CatalystItemDefinition): JSX.Element => {
    const rating = getSlotRating(entry.slot);
    const tooltipMeta = getWowheadItemTooltip(entry.id);

    return (
      <button
        key={`${entry.classId}-${entry.slot}`}
        type="button"
        className={`w-full border px-3 py-2 text-left transition ${getButtonClass(rating)}`}
        onClick={() => onCycleSlotRating(entry.slot)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{formatSlot(entry.slot)}</span>
          <span className="text-xs uppercase tracking-wide">{getLabel(rating)}</span>
        </div>
        <div className="mt-2">
          <a
            href={tooltipMeta.wowheadUrl}
            data-wowhead={tooltipMeta.dataWowhead}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[17px] font-semibold leading-tight opacity-90 hover:text-white"
            onClick={(event) => event.stopPropagation()}
            onMouseEnter={() => refreshWowheadTooltips()}
          >
            {entry.name}
          </a>
        </div>
      </button>
    );
  };

  return (
    <section className="panel-angled p-4">
      <h2 className="font-display text-lg text-midnight-silver">Catalyst Rating</h2>
      <p className="mt-1 text-sm text-midnight-muted">
        Click to cycle ratings for all catalyst eligible items. Item-specific ratings override catalyst.
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-midnight-cyan">Tier Set Slots</h3>
          {setEntries.map((entry) => renderEntry(entry))}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-midnight-cyan">Off-Set Slots</h3>
          {offSetEntries.map((entry) => renderEntry(entry))}
        </div>
      </div>
    </section>
  );
}
