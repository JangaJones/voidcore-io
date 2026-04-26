const GLOBAL_SLOT_ORDER: string[] = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "finger",
  "trinket",
  "mainhand",
  "offhand"
];

const SLOT_ORDER_INDEX = GLOBAL_SLOT_ORDER.reduce<Record<string, number>>((acc, slot, index) => {
  acc[slot] = index;
  return acc;
}, {});

export function normalizeSlotForSort(slot: string): string {
  const normalized = slot.toLowerCase();

  if (normalized === "weapon_1h" || normalized === "weapon_2h" || normalized === "main_hand" || normalized === "mainhand" || normalized === "ranged") {
    return "mainhand";
  }

  if (normalized === "off_hand" || normalized === "offhand") {
    return "offhand";
  }

  return normalized;
}

export function sortByGlobalSlotOrder<T extends { slot: string; name: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const aRank = SLOT_ORDER_INDEX[normalizeSlotForSort(a.slot)] ?? Number.MAX_SAFE_INTEGER;
    const bRank = SLOT_ORDER_INDEX[normalizeSlotForSort(b.slot)] ?? Number.MAX_SAFE_INTEGER;

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    const slotCompare = a.slot.localeCompare(b.slot);
    if (slotCompare !== 0) {
      return slotCompare;
    }

    return a.name.localeCompare(b.name);
  });
}
