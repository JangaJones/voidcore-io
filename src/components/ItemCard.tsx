import type { LootItem, Rating } from "../data/types";
import { RATING_LABELS } from "../data/types";
import { getItemIconUrl, getRemoteWowheadIconUrl } from "../lib/wowhead-icons";
import { getWowheadItemTooltip, refreshWowheadTooltips } from "../lib/wowhead";

type CatalystVisualState = "inactive" | "active-nice" | "active-bis" | "overridden";

interface ItemCardProps {
  item: LootItem;
  rating: Rating;
  onRatingChange: (rating: Rating) => void;
  onToggleRemoved: (removed: boolean) => void;
  availableSpecNames: string[];
  catalystState: CatalystVisualState;
}

function cycleItemRating(rating: Rating): Rating {
  if (rating === "ignore") return "nice";
  if (rating === "nice") return "bis";
  return "ignore";
}

function formatFallbackSlot(slot: string): string {
  return slot
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSlotTag(item: LootItem): string {
  const weaponTagBySubclass: Record<string, string> = {
    axe2h: "2H Axe",
    axe1h: "1H Axe",
    bow: "Bow",
    crossbow: "Crossbow",
    dagger: "Dagger",
    fist: "Fist Weapon",
    gun: "Gun",
    mace2h: "2H Mace",
    mace1h: "1H Mace",
    polearm: "Polearm",
    staff: "Staff",
    sword2h: "2H Sword",
    sword1h: "1H Sword",
    wand: "Wand",
    warglaive: "Warglaive",
    offhand: "Off-Hand",
    shield: "Off-Hand"
  };

  if (item.weaponSubclass && weaponTagBySubclass[item.weaponSubclass]) {
    return weaponTagBySubclass[item.weaponSubclass];
  }

  const slotTagBySlot: Record<string, string> = {
    head: "Head",
    neck: "Neck",
    shoulder: "Shoulder",
    back: "Back",
    chest: "Chest",
    wrist: "Wrist",
    hands: "Hands",
    waist: "Waist",
    legs: "Legs",
    feet: "Feet",
    finger: "Finger",
    trinket: "Trinket",
    offhand: "Off-Hand",
    weapon_1h: "Mainhand",
    weapon_2h: "Mainhand",
    ranged: "Mainhand"
  };

  return slotTagBySlot[item.slot] ?? formatFallbackSlot(item.slot);
}

export function ItemCard({ item, rating, onRatingChange, onToggleRemoved, availableSpecNames, catalystState }: ItemCardProps): JSX.Element {
  const isRemoved = rating === "removed";
  const tooltipMeta = getWowheadItemTooltip(item.id);
  const wowheadUrl = tooltipMeta.wowheadUrl;
  const slotTag = getSlotTag(item);
  const voidcoreIconUrl = getItemIconUrl("inv_1205_voidforge_fluctuatingvoidcores_cosmicvoid");
  const voidcoreRemoteIconUrl = getRemoteWowheadIconUrl("inv_1205_voidforge_fluctuatingvoidcores_cosmicvoid");
  const catalystLabel =
    catalystState === "active-bis" ? "Catalyst: Best In Slot" : catalystState === "active-nice" ? "Catalyst: Nice To Have" : null;
  const catalystOverrideLabel = catalystState === "overridden" ? "Catalyst Overridden" : null;

  const cardToneClass = (() => {
    if (isRemoved) {
      return "border-slate-700/85 bg-slate-950/55";
    }

    if (catalystState === "active-bis") {
      return "border-amber-300/70 bg-slate-900/45";
    }

    if (catalystState === "active-nice") {
      return "border-emerald-300/65 bg-slate-900/45";
    }

    if (rating === "bis") {
      return "border-amber-300/70 bg-slate-950/55";
    }

    if (rating === "nice") {
      return "border-emerald-300/65 bg-slate-950/55";
    }

    return "border-slate-700/85 bg-slate-950/55";
  })();

  const ratingTagClass = (() => {
    if (rating === "bis") {
      return "border-amber-400/70 bg-amber-900/25 text-amber-100";
    }
    if (rating === "nice") {
      return "border-emerald-400/70 bg-emerald-900/20 text-emerald-100";
    }
    return "border-slate-600/70 bg-slate-900/55 text-midnight-muted";
  })();

  const catalystTagClass = (() => {
    if (catalystState === "active-bis") {
      return "border-amber-400/70 bg-amber-900/25 text-amber-100";
    }
    if (catalystState === "active-nice") {
      return "border-emerald-400/70 bg-emerald-900/20 text-emerald-100";
    }
    return "border-slate-500/70 bg-slate-900/55 text-slate-300";
  })();

  const handleCycleRating = (): void => {
    if (isRemoved) {
      return;
    }
    onRatingChange(cycleItemRating(rating));
  };

  return (
    <article
      className={`border p-2.5 transition ${cardToneClass} ${isRemoved ? "cursor-default" : "cursor-pointer hover:brightness-110"}`}
      aria-label={`${item.name} rating card`}
      role="button"
      aria-disabled={isRemoved}
      tabIndex={0}
      onClick={handleCycleRating}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCycleRating();
        }
      }}
    >
      <div className={`flex h-full flex-col ${isRemoved ? "opacity-55" : ""}`}>
        <div>
          <a
            href={wowheadUrl}
            data-wowhead={tooltipMeta.dataWowhead}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[17px] font-semibold leading-tight text-midnight-silver hover:text-white"
            onClick={(event) => event.stopPropagation()}
            onMouseEnter={() => refreshWowheadTooltips()}
          >
            {item.name}
          </a>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
          <span className="badge border-slate-700/70 bg-slate-900/55 text-slate-200">{slotTag}</span>
          <span className={`badge ${ratingTagClass}`}>{RATING_LABELS[rating]}</span>
          {catalystLabel && <span className={`badge ${catalystTagClass}`}>{catalystLabel}</span>}
          {catalystOverrideLabel && <span className={`badge ${catalystTagClass}`}>{catalystOverrideLabel}</span>}
        </div>

       

        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="mt-1.5 text-[13px] text-midnight-muted">{availableSpecNames.join(", ") || "None"}</p>
          <button
            type="button"
            className={`z-20 flex h-8 w-8 items-center justify-center border transition ${
              isRemoved
                ? "border-cyan-300/70 bg-cyan-950/25 opacity-100"
                : "border-slate-600/70 bg-slate-900/60 opacity-65 hover:opacity-100"
            }`}
            title={isRemoved ? "Removed from loot pool (click to restore)" : "Remove from loot pool"}
            aria-label={isRemoved ? "Restore item to loot pool" : "Remove item from loot pool"}
            aria-pressed={isRemoved}
            onClick={(event) => {
              event.stopPropagation();
              onToggleRemoved(!isRemoved);
            }}
          >
            <img
              src={voidcoreIconUrl ?? voidcoreRemoteIconUrl}
              alt=""
              className={`h-6 w-6 object-contain ${isRemoved ? "grayscale-0" : "grayscale"}`}
              onError={(event) => {
                if (event.currentTarget.src !== voidcoreRemoteIconUrl) {
                  event.currentTarget.src = voidcoreRemoteIconUrl;
                }
              }}
            />
          </button>
        </div>
      </div>
    </article>
  );
}
