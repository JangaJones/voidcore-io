import type {
  CatalystItemDefinition,
  CatalystRating,
  ClassDefinition,
  LootItem,
  PersistedAppState,
  SpecCatalystRatings
} from "../data/types";

export const CATALYST_SET_SLOTS = ["head", "shoulder", "chest", "hands", "legs"] as const;
export const CATALYST_OFF_SET_SLOTS = ["back", "wrist", "waist", "feet"] as const;

const CATALYST_SLOT_SET = new Set<string>([...CATALYST_SET_SLOTS, ...CATALYST_OFF_SET_SLOTS]);

function toKey(value: number): string {
  return String(value);
}

export function isCatalystSlot(slot: string): boolean {
  return CATALYST_SLOT_SET.has(slot);
}

export function getCatalystProfileForSpec(
  state: PersistedAppState,
  classId: number,
  specId: number
): SpecCatalystRatings {
  return state.catalystByClass[toKey(classId)]?.[toKey(specId)] ?? {};
}

export function getCatalystRatingForSlot(
  catalystBySpec: SpecCatalystRatings,
  slotKey: string
): CatalystRating {
  return catalystBySpec[slotKey]?.rating ?? "ignore";
}

export function cycleCatalystRating(current: CatalystRating): CatalystRating {
  if (current === "ignore") return "nice";
  if (current === "nice") return "bis";
  return "ignore";
}

export function isItemCatalystEligibleForClass(item: LootItem, classDef: ClassDefinition): boolean {
  if (!item.catalystEligible || !item.catalystSlotKey || !isCatalystSlot(item.catalystSlotKey)) {
    return false;
  }

  if (item.armorType && item.armorType !== classDef.armorType) {
    return false;
  }

  return true;
}

export function getCatalystSlotEntriesForClass(
  catalystItems: CatalystItemDefinition[],
  classId: number
): CatalystItemDefinition[] {
  return catalystItems
    .filter((item) => item.classId === classId)
    .sort((a, b) => {
      if (a.catalystTierType !== b.catalystTierType) {
        return a.catalystTierType === "set" ? -1 : 1;
      }

      return a.slot.localeCompare(b.slot);
    });
}
