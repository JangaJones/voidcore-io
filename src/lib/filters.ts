import type { ContentFilter, LootItem, LootSource, SlotFilterValue } from "../data/types";

export function sourceMatchesContentFilter(source: LootSource, contentFilter: ContentFilter): boolean {
  if (contentFilter === "all") {
    return true;
  }

  if (contentFilter === "mythic-plus") {
    return source.group === "mythic-plus" || source.type === "mythicPlus";
  }

  return source.group === "raid" || source.type === "raid";
}

export function filterSourcesByContent(sources: LootSource[], contentFilter: ContentFilter): LootSource[] {
  return sources.filter((source) => sourceMatchesContentFilter(source, contentFilter));
}

export function itemMatchesSlotFilter(item: LootItem, slotFilter: SlotFilterValue): boolean {
  if (slotFilter === "all") {
    return true;
  }

  return item.slot === slotFilter;
}

export function filterItemsBySlot(items: LootItem[], slotFilter: SlotFilterValue): LootItem[] {
  return items.filter((item) => itemMatchesSlotFilter(item, slotFilter));
}

export function getSortedSlotOptions(items: LootItem[]): string[] {
  const slots = new Set<string>();

  for (const item of items) {
    slots.add(item.slot);
  }

  return [...slots].sort((a, b) => a.localeCompare(b));
}
