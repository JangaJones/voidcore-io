export type Role = "dps" | "tank" | "healer";
export type MainStat = "str" | "agi" | "int";
export type CatalystTierType = "set" | "off-set";
export type CatalystRating = "ignore" | "nice" | "bis";
export type RecommendationSortMode = "bis" | "nice";

export interface SpecDefinition {
  id: number;
  name: string;
  role: Role;
  mainStat: MainStat | null;
  classId: number;
  className: string;
}

export interface ClassDefinition {
  id: number;
  name: string;
  armorType: string;
  weaponSubclasses: string[];
  specs: SpecDefinition[];
}

export type LootSourceType = "mythicPlus" | "raid" | "worldBoss" | "delve" | "catalyst" | string;
export type LootSourceGroup = "mythic-plus" | "raid" | "other";

export interface LootSource {
  id: string;
  type: LootSourceType;
  name: string;
  encounterId: number | null;
  instanceId: number | null;
  instanceName: string | null;
  group: LootSourceGroup;
  bonusRollCost: number;
  sortOrder: number;
}

export interface LootItemSourceRef {
  type: LootSourceType;
  name: string;
  encounterId: number | null;
}

export interface LootItem {
  id: number;
  name: string;
  icon: string | null;
  quality: string;
  slot: string;
  armorType: string | null;
  weaponType: string | null;
  weaponSubclass: string | null;
  primaryStatIds: number[] | null;
  sourceId: string;
  source: LootItemSourceRef;
  specificRoles: Role[] | null;
  specs: number[] | null;
  catalystEligible: boolean;
  catalystTierType: CatalystTierType | null;
  catalystSlotKey: string | null;
}

export interface CatalystItemDefinition {
  id: number;
  name: string;
  icon: string | null;
  slot: string;
  armorType: string | null;
  classId: number;
  className: string;
  catalystTierType: CatalystTierType;
  raidEncounterId: number | null;
  raidEncounterName: string | null;
}

export interface LootDatabase {
  schemaVersion: number;
  dataVersion: string;
  game: string;
  expansion: string;
  season: string;
  seasonNumber: number;
  generatedAt: string;
  sourceLastUpdated: string | null;
  classes: ClassDefinition[];
  specIndex: Record<string, SpecDefinition>;
  sources: LootSource[];
  items: LootItem[];
  catalystItems: CatalystItemDefinition[];
}

export type Rating = "removed" | "ignore" | "nice" | "bis";
export type EffectiveRating = Rating | "catalyst-nice" | "catalyst-bis";

export interface RatingStateEntry {
  rating: Rating;
  touched: boolean;
  updatedAt: string;
}

export interface RemovedStateEntry {
  removed: boolean;
  touched: boolean;
  updatedAt: string;
}

export interface CatalystStateEntry {
  rating: CatalystRating;
  touched: boolean;
  updatedAt: string;
}

export type ItemRatings = Record<string, RatingStateEntry>;
export type SpecRatings = Record<string, ItemRatings>;
export type ClassRatings = Record<string, SpecRatings>;
export type ClassRemovedItems = Record<string, Record<string, RemovedStateEntry>>;
export type SpecCatalystRatings = Record<string, CatalystStateEntry>;
export type ClassCatalystRatings = Record<string, Record<string, SpecCatalystRatings>>;

export interface PersistedAppState {
  schemaVersion: number;
  dataVersion: string;
  selectedClassId: number;
  selectedSpecId: number;
  ratings: ClassRatings;
  removedByClass: ClassRemovedItems;
  catalystByClass: ClassCatalystRatings;
}

export interface RatingCounts {
  ignore: number;
  nice: number;
  bis: number;
}

export interface CalculationResult {
  sourceId: string;
  sourceName: string;
  sourceSortOrder: number;
  specId: number;
  specName: string;
  isDefaultProfile: boolean;
  hasValidPool: boolean;
  denominator: number;
  poolSizeBeforeRemoved: number;
  removedCount: number;
  bonusRollCost: number;
  exactIgnoreChance: number;
  exactNiceChance: number;
  exactBisChance: number;
  niceOrBetterValueChance: number;
  unluckyChance: number;
  perVoidcoreExactBisChance: number;
  perVoidcoreNiceOrBetterChance: number;
  perVoidcoreUnluckyChance: number;
  counts: RatingCounts;
}

export interface RecommendationResult {
  sortMode: RecommendationSortMode;
  topRecommendations: CalculationResult[];
}

export interface SpecComparisonResult {
  sourceId: string;
  sourceName: string;
  sourceSortOrder: number;
  currentSpecId: number;
  currentSpecName: string;
  bestSpecId: number | null;
  bestSpecName: string | null;
  currentResult: CalculationResult | null;
  bestResult: CalculationResult | null;
  deltaExactBisChance: number;
  deltaUnluckyChance: number;
  bisExclusiveItems: Array<{
    itemId: number;
    itemName: string;
    availableSpecNames: string[];
  }>;
}

export type ContentFilter = "all" | "mythic-plus" | "raid";
export type SlotFilterValue = "all" | string;

export const STORAGE_KEY = "wow-midnight-loot-optimizer:v1";
export const STORAGE_SCHEMA_VERSION = 1;

export const RATING_LABELS: Record<Rating, string> = {
  removed: "Bonus Rolled",
  ignore: "Ignore Item",
  nice: "Nice To Have",
  bis: "Best In Slot"
};

export const RATING_WEIGHTS: Record<Rating, number> = {
  removed: 0,
  ignore: 0,
  nice: 1,
  bis: 2
};

export const RATING_OPTIONS: Rating[] = ["removed", "ignore", "nice", "bis"];
