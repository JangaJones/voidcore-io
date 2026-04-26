import type {
  CalculationResult,
  ClassCatalystRatings,
  ClassRemovedItems,
  ClassDefinition,
  ClassRatings,
  ContentFilter,
  EffectiveRating,
  LootItem,
  LootSource,
  Rating,
  RecommendationResult,
  RecommendationSortMode,
  SlotFilterValue,
  SpecComparisonResult,
  SpecDefinition
} from "../data/types";
import { getEligibleSpecsForItem, isItemEligibleForSpec } from "./eligibility";
import { filterSourcesByContent, itemMatchesSlotFilter } from "./filters";
import { isItemCatalystEligibleForClass } from "./catalyst";

interface EffectiveLootPoolResult {
  poolItems: LootItem[];
  nonRemovedItems: LootItem[];
  removedItems: LootItem[];
}

interface CalculateSourceValueParams {
  source: LootSource;
  spec: SpecDefinition;
  classDef: ClassDefinition;
  items: LootItem[];
  ratingsForSpec?: ClassRatings[string][string];
  removedItemsForClass?: ClassRemovedItems[string];
  catalystRatingsForSpec?: ClassCatalystRatings[string][string];
  slotFilter?: SlotFilterValue;
  applySlotFilterToCalculations?: boolean;
  isDefaultProfile?: boolean;
}

interface CalculateAllSourceValuesForSpecParams {
  sources: LootSource[];
  spec: SpecDefinition;
  classDef: ClassDefinition;
  items: LootItem[];
  ratingsForSpec?: ClassRatings[string][string];
  removedItemsForClass?: ClassRemovedItems[string];
  catalystRatingsForSpec?: ClassCatalystRatings[string][string];
  slotFilter?: SlotFilterValue;
  applySlotFilterToCalculations?: boolean;
  contentFilter?: ContentFilter;
  sortMode?: RecommendationSortMode;
  preferredSpecId?: number;
  isDefaultProfile?: boolean;
}

interface CalculateBestSpecForSourceWithinClassParams {
  source: LootSource;
  classDef: ClassDefinition;
  items: LootItem[];
  ratingsByClass: ClassRatings;
  ratingsForAllCandidateSpecs?: ClassRatings[string][string];
  removedItemsForClass?: ClassRemovedItems[string];
  catalystRatingsForSpec?: ClassCatalystRatings[string][string];
  preferredSpecId?: number;
  slotFilter?: SlotFilterValue;
  applySlotFilterToCalculations?: boolean;
  sortMode?: RecommendationSortMode;
}

interface CalculateOverallRecommendationParams {
  classDef: ClassDefinition;
  sources: LootSource[];
  items: LootItem[];
  ratingsByClass: ClassRatings;
  removedByClass: ClassRemovedItems;
  catalystByClass: ClassCatalystRatings;
  currentSpecId: number;
  slotFilter?: SlotFilterValue;
  applySlotFilterToCalculations?: boolean;
  contentFilter?: ContentFilter;
  sortMode?: RecommendationSortMode;
}

interface CompareCurrentSpecWithBestSpecParams {
  classDef: ClassDefinition;
  sources: LootSource[];
  items: LootItem[];
  ratingsByClass: ClassRatings;
  removedByClass: ClassRemovedItems;
  catalystByClass: ClassCatalystRatings;
  currentSpecId: number;
  slotFilter?: SlotFilterValue;
  applySlotFilterToCalculations?: boolean;
  contentFilter?: ContentFilter;
  sortMode?: RecommendationSortMode;
}

interface BestSpecForSourceResult {
  bestSpec: SpecDefinition | null;
  bestResult: CalculationResult | null;
  resultsBySpec: CalculationResult[];
}

function toKey(value: number): string {
  return String(value);
}

function normalizeRating(value: unknown): Rating {
  if (value === "removed") return "removed";
  if (value === "nice") return "nice";
  if (value === "bis") return "bis";
  return "ignore";
}

function getExplicitRating(itemId: number, ratingsForSpec?: ClassRatings[string][string]): Rating {
  return normalizeRating(ratingsForSpec?.[toKey(itemId)]?.rating);
}

function isItemRemoved(
  itemId: number,
  ratingsForSpec?: ClassRatings[string][string],
  removedItemsForClass?: ClassRemovedItems[string]
): boolean {
  if (removedItemsForClass?.[toKey(itemId)]?.removed === true) {
    return true;
  }

  return getExplicitRating(itemId, ratingsForSpec) === "removed";
}

function getCatalystSlotRating(item: LootItem, catalystRatingsForSpec?: ClassCatalystRatings[string][string]): Rating {
  if (!item.catalystSlotKey) {
    return "ignore";
  }

  const state = catalystRatingsForSpec?.[item.catalystSlotKey];
  return normalizeRating(state?.rating);
}

function getEffectiveRating(
  item: LootItem,
  spec: SpecDefinition,
  classDef: ClassDefinition,
  ratingsForSpec?: ClassRatings[string][string],
  removedItemsForClass?: ClassRemovedItems[string],
  catalystRatingsForSpec?: ClassCatalystRatings[string][string]
): EffectiveRating {
  if (isItemRemoved(item.id, ratingsForSpec, removedItemsForClass)) {
    return "removed";
  }

  const explicit = getExplicitRating(item.id, ratingsForSpec);
  if (explicit === "nice" || explicit === "bis") {
    return explicit;
  }

  if (isItemCatalystEligibleForClass(item, classDef) && isItemEligibleForSpec(item, spec, classDef)) {
    const catalystRating = getCatalystSlotRating(item, catalystRatingsForSpec);
    if (catalystRating === "nice") {
      return "catalyst-nice";
    }

    if (catalystRating === "bis") {
      return "catalyst-bis";
    }
  }

  return "ignore";
}

function hasExplicitRatingsForSpec(ratingsForSpec?: ClassRatings[string][string]): boolean {
  if (!ratingsForSpec) {
    return false;
  }

  return Object.values(ratingsForSpec).some((entry) => entry.touched);
}

function hasExplicitClassRemovedItems(removedItemsForClass?: ClassRemovedItems[string]): boolean {
  if (!removedItemsForClass) {
    return false;
  }

  return Object.values(removedItemsForClass).some((entry) => entry.touched && entry.removed);
}

function hasExplicitCatalystRatings(catalystRatingsForSpec?: ClassCatalystRatings[string][string]): boolean {
  if (!catalystRatingsForSpec) {
    return false;
  }

  return Object.values(catalystRatingsForSpec).some((entry) => entry.touched && normalizeRating(entry.rating) !== "ignore");
}

function buildZeroResult(
  source: LootSource,
  spec: SpecDefinition,
  isDefaultProfile: boolean,
  poolSizeBeforeRemoved: number,
  removedCount: number
): CalculationResult {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceSortOrder: source.sortOrder,
    specId: spec.id,
    specName: spec.name,
    isDefaultProfile,
    hasValidPool: false,
    denominator: 0,
    poolSizeBeforeRemoved,
    removedCount,
    bonusRollCost: source.bonusRollCost,
    exactIgnoreChance: 0,
    exactNiceChance: 0,
    exactBisChance: 0,
    niceOrBetterValueChance: 0,
    unluckyChance: 0,
    perVoidcoreExactBisChance: 0,
    perVoidcoreNiceOrBetterChance: 0,
    perVoidcoreUnluckyChance: 0,
    counts: {
      ignore: 0,
      nice: 0,
      bis: 0
    }
  };
}

function compareBySortMode(a: CalculationResult, b: CalculationResult, sortMode: RecommendationSortMode): number {
  const aMetric = sortMode === "bis" ? a.perVoidcoreExactBisChance : a.perVoidcoreNiceOrBetterChance;
  const bMetric = sortMode === "bis" ? b.perVoidcoreExactBisChance : b.perVoidcoreNiceOrBetterChance;

  if (aMetric !== bMetric) {
    return bMetric - aMetric;
  }

  if (a.exactBisChance !== b.exactBisChance) {
    return b.exactBisChance - a.exactBisChance;
  }

  if (a.niceOrBetterValueChance !== b.niceOrBetterValueChance) {
    return b.niceOrBetterValueChance - a.niceOrBetterValueChance;
  }

  return 0;
}

function compareCalculationResultsWithPreferredSpec(
  a: CalculationResult,
  b: CalculationResult,
  sortMode: RecommendationSortMode,
  preferredSpecId?: number
): number {
  if (a.hasValidPool !== b.hasValidPool) {
    return a.hasValidPool ? -1 : 1;
  }

  const byMode = compareBySortMode(a, b, sortMode);
  if (byMode !== 0) {
    return byMode;
  }

  if (preferredSpecId !== undefined) {
    const aPreferred = a.specId === preferredSpecId;
    const bPreferred = b.specId === preferredSpecId;
    if (aPreferred !== bPreferred) {
      return aPreferred ? -1 : 1;
    }
  }

  if (a.denominator !== b.denominator) {
    return a.denominator - b.denominator;
  }

  if (a.sourceSortOrder !== b.sourceSortOrder) {
    return a.sourceSortOrder - b.sourceSortOrder;
  }

  return a.sourceName.localeCompare(b.sourceName);
}

export function compareCalculationResults(a: CalculationResult, b: CalculationResult): number {
  return compareCalculationResultsWithPreferredSpec(a, b, "bis");
}

export function getAvailableItemsForSpec(items: LootItem[], spec: SpecDefinition, classDef: ClassDefinition): LootItem[] {
  return items.filter((item) => isItemEligibleForSpec(item, spec, classDef));
}

export function getEffectiveLootPool(params: {
  source: LootSource;
  spec: SpecDefinition;
  classDef: ClassDefinition;
  items: LootItem[];
  ratingsForSpec?: ClassRatings[string][string];
  removedItemsForClass?: ClassRemovedItems[string];
  slotFilter?: SlotFilterValue;
  applySlotFilterToCalculations?: boolean;
}): EffectiveLootPoolResult {
  const {
    source,
    spec,
    classDef,
    items,
    ratingsForSpec,
    removedItemsForClass,
    slotFilter = "all",
    applySlotFilterToCalculations = false
  } = params;

  const poolItems = items.filter((item) => {
    if (item.sourceId !== source.id) {
      return false;
    }

    if (!isItemEligibleForSpec(item, spec, classDef)) {
      return false;
    }

    if (applySlotFilterToCalculations && !itemMatchesSlotFilter(item, slotFilter)) {
      return false;
    }

    return true;
  });

  const nonRemovedItems = poolItems.filter((item) => !isItemRemoved(item.id, ratingsForSpec, removedItemsForClass));
  const removedItems = poolItems.filter((item) => isItemRemoved(item.id, ratingsForSpec, removedItemsForClass));

  return {
    poolItems,
    nonRemovedItems,
    removedItems
  };
}

export function calculateSourceValue(params: CalculateSourceValueParams): CalculationResult {
  const {
    source,
    spec,
    classDef,
    items,
    ratingsForSpec,
    removedItemsForClass,
    catalystRatingsForSpec,
    slotFilter = "all",
    applySlotFilterToCalculations = false,
    isDefaultProfile =
      !hasExplicitRatingsForSpec(ratingsForSpec) &&
      !hasExplicitClassRemovedItems(removedItemsForClass) &&
      !hasExplicitCatalystRatings(catalystRatingsForSpec)
  } = params;

  const pool = getEffectiveLootPool({
    source,
    spec,
    classDef,
    items,
    ratingsForSpec,
    removedItemsForClass,
    slotFilter,
    applySlotFilterToCalculations
  });

  const denominator = pool.nonRemovedItems.length;
  if (denominator === 0) {
    return buildZeroResult(source, spec, isDefaultProfile, pool.poolItems.length, pool.removedItems.length);
  }

  const counts = {
    ignore: 0,
    nice: 0,
    bis: 0
  };

  for (const item of pool.nonRemovedItems) {
    const effective = getEffectiveRating(item, spec, classDef, ratingsForSpec, removedItemsForClass, catalystRatingsForSpec);

    if (effective === "bis" || effective === "catalyst-bis") {
      counts.bis += 1;
    } else if (effective === "nice" || effective === "catalyst-nice") {
      counts.nice += 1;
    } else {
      counts.ignore += 1;
    }
  }

  const exactIgnoreChance = counts.ignore / denominator;
  const exactNiceChance = counts.nice / denominator;
  const exactBisChance = counts.bis / denominator;
  const niceOrBetterValueChance = (counts.nice + counts.bis) / denominator;
  const unluckyChance = exactIgnoreChance;

  const cost = source.bonusRollCost > 0 ? source.bonusRollCost : 1;

  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceSortOrder: source.sortOrder,
    specId: spec.id,
    specName: spec.name,
    isDefaultProfile,
    hasValidPool: true,
    denominator,
    poolSizeBeforeRemoved: pool.poolItems.length,
    removedCount: pool.removedItems.length,
    bonusRollCost: cost,
    exactIgnoreChance,
    exactNiceChance,
    exactBisChance,
    niceOrBetterValueChance,
    unluckyChance,
    perVoidcoreExactBisChance: exactBisChance / cost,
    perVoidcoreNiceOrBetterChance: niceOrBetterValueChance / cost,
    perVoidcoreUnluckyChance: unluckyChance / cost,
    counts
  };
}

export function calculateAllSourceValuesForSpec(params: CalculateAllSourceValuesForSpecParams): CalculationResult[] {
  const {
    sources,
    spec,
    classDef,
    items,
    ratingsForSpec,
    removedItemsForClass,
    catalystRatingsForSpec,
    slotFilter = "all",
    applySlotFilterToCalculations = false,
    contentFilter = "all",
    sortMode = "bis",
    preferredSpecId,
    isDefaultProfile =
      !hasExplicitRatingsForSpec(ratingsForSpec) &&
      !hasExplicitClassRemovedItems(removedItemsForClass) &&
      !hasExplicitCatalystRatings(catalystRatingsForSpec)
  } = params;

  const filteredSources = filterSourcesByContent(sources, contentFilter);

  return filteredSources
    .map((source) =>
      calculateSourceValue({
        source,
        spec,
        classDef,
        items,
        ratingsForSpec,
        removedItemsForClass,
        catalystRatingsForSpec,
        slotFilter,
        applySlotFilterToCalculations,
        isDefaultProfile
      })
    )
    .sort((a, b) => compareCalculationResultsWithPreferredSpec(a, b, sortMode, preferredSpecId));
}

export function calculateBestSourceForSpec(params: CalculateAllSourceValuesForSpecParams): CalculationResult | null {
  const all = calculateAllSourceValuesForSpec(params).filter((result) => result.hasValidPool);
  return all[0] ?? null;
}

export function calculateBestSpecForSourceWithinClass(params: CalculateBestSpecForSourceWithinClassParams): BestSpecForSourceResult {
  const {
    source,
    classDef,
    items,
    ratingsByClass,
    ratingsForAllCandidateSpecs,
    removedItemsForClass,
    catalystRatingsForSpec,
    preferredSpecId,
    slotFilter = "all",
    applySlotFilterToCalculations = false,
    sortMode = "bis"
  } = params;

  const resultsBySpec = classDef.specs.map((spec) => {
    const ratingsForSpec = ratingsForAllCandidateSpecs ?? ratingsByClass[toKey(classDef.id)]?.[toKey(spec.id)];
    const isDefaultProfile =
      !hasExplicitRatingsForSpec(ratingsForSpec) &&
      !hasExplicitClassRemovedItems(removedItemsForClass) &&
      !hasExplicitCatalystRatings(catalystRatingsForSpec);

    return calculateSourceValue({
      source,
      spec,
      classDef,
      items,
      ratingsForSpec,
      removedItemsForClass,
      catalystRatingsForSpec,
      slotFilter,
      applySlotFilterToCalculations,
      isDefaultProfile
    });
  });

  const validResults = resultsBySpec
    .filter((result) => result.hasValidPool)
    .sort((a, b) => compareCalculationResultsWithPreferredSpec(a, b, sortMode, preferredSpecId));

  const bestResult = validResults[0] ?? null;
  const bestSpec = bestResult ? classDef.specs.find((spec) => spec.id === bestResult.specId) ?? null : null;

  return {
    bestSpec,
    bestResult,
    resultsBySpec
  };
}

export function calculateOverallRecommendation(params: CalculateOverallRecommendationParams): RecommendationResult {
  const {
    classDef,
    sources,
    items,
    ratingsByClass,
    removedByClass,
    catalystByClass,
    currentSpecId,
    slotFilter = "all",
    applySlotFilterToCalculations = false,
    contentFilter = "all",
    sortMode = "bis"
  } = params;

  const currentSpec = classDef.specs.find((spec) => spec.id === currentSpecId) ?? classDef.specs[0];
  const ratingsForCurrentSpec = ratingsByClass[toKey(classDef.id)]?.[toKey(currentSpec.id)] ?? {};
  const removedItemsForClass = removedByClass[toKey(classDef.id)] ?? {};
  const catalystRatingsForSpec = catalystByClass[toKey(classDef.id)]?.[toKey(currentSpec.id)] ?? {};

  const filteredSources = filterSourcesByContent(sources, contentFilter);
  const bestPerSource: CalculationResult[] = [];

  for (const source of filteredSources) {
    const best = calculateBestSpecForSourceWithinClass({
      source,
      classDef,
      items,
      ratingsByClass,
      ratingsForAllCandidateSpecs: ratingsForCurrentSpec,
      removedItemsForClass,
      catalystRatingsForSpec,
      preferredSpecId: currentSpec.id,
      slotFilter,
      applySlotFilterToCalculations,
      sortMode
    });

    if (best.bestResult && best.bestResult.niceOrBetterValueChance > 0) {
      bestPerSource.push(best.bestResult);
    }
  }

  bestPerSource.sort((a, b) => compareCalculationResultsWithPreferredSpec(a, b, sortMode, currentSpec.id));

  return {
    sortMode,
    topRecommendations: bestPerSource.slice(0, 3)
  };
}

function buildBisExclusiveItems(params: {
  source: LootSource;
  classDef: ClassDefinition;
  currentSpec: SpecDefinition;
  bestSpec: SpecDefinition | null;
  items: LootItem[];
  ratingsForCurrentSpec?: ClassRatings[string][string];
  removedItemsForClass?: ClassRemovedItems[string];
  slotFilter?: SlotFilterValue;
  applySlotFilterToCalculations?: boolean;
}): SpecComparisonResult["bisExclusiveItems"] {
  const {
    source,
    classDef,
    currentSpec,
    bestSpec,
    items,
    ratingsForCurrentSpec,
    removedItemsForClass,
    slotFilter = "all",
    applySlotFilterToCalculations = false
  } = params;

  if (!bestSpec || bestSpec.id === currentSpec.id) {
    return [];
  }

  const result: SpecComparisonResult["bisExclusiveItems"] = [];

  for (const item of items) {
    if (item.sourceId !== source.id) {
      continue;
    }

    if (!isItemEligibleForSpec(item, currentSpec, classDef)) {
      continue;
    }

    if (applySlotFilterToCalculations && !itemMatchesSlotFilter(item, slotFilter)) {
      continue;
    }

    if (isItemRemoved(item.id, ratingsForCurrentSpec, removedItemsForClass)) {
      continue;
    }

    if (getExplicitRating(item.id, ratingsForCurrentSpec) !== "bis") {
      continue;
    }

    if (isItemEligibleForSpec(item, bestSpec, classDef)) {
      continue;
    }

    const availableSpecNames = getEligibleSpecsForItem(item, classDef).map((spec) => spec.name);
    result.push({
      itemId: item.id,
      itemName: item.name,
      availableSpecNames
    });
  }

  return result;
}

export function compareCurrentSpecWithBestSpec(params: CompareCurrentSpecWithBestSpecParams): SpecComparisonResult[] {
  const {
    classDef,
    sources,
    items,
    ratingsByClass,
    removedByClass,
    catalystByClass,
    currentSpecId,
    slotFilter = "all",
    applySlotFilterToCalculations = false,
    contentFilter = "all",
    sortMode = "bis"
  } = params;

  const currentSpec = classDef.specs.find((spec) => spec.id === currentSpecId) ?? classDef.specs[0];
  const ratingsForCurrentSpec = ratingsByClass[toKey(classDef.id)]?.[toKey(currentSpec.id)] ?? {};
  const removedItemsForClass = removedByClass[toKey(classDef.id)] ?? {};
  const catalystRatingsForSpec = catalystByClass[toKey(classDef.id)]?.[toKey(currentSpec.id)] ?? {};

  const filteredSources = filterSourcesByContent(sources, contentFilter).sort((a, b) => a.sortOrder - b.sortOrder);

  const rows: SpecComparisonResult[] = [];

  for (const source of filteredSources) {
    const perSource = calculateBestSpecForSourceWithinClass({
      source,
      classDef,
      items,
      ratingsByClass,
      ratingsForAllCandidateSpecs: ratingsForCurrentSpec,
      removedItemsForClass,
      catalystRatingsForSpec,
      preferredSpecId: currentSpec.id,
      slotFilter,
      applySlotFilterToCalculations,
      sortMode
    });

    const currentResult =
      perSource.resultsBySpec.find((result) => result.specId === currentSpec.id) ??
      calculateSourceValue({
        source,
        spec: currentSpec,
        classDef,
        items,
        ratingsForSpec: ratingsForCurrentSpec,
        removedItemsForClass,
        catalystRatingsForSpec,
        slotFilter,
        applySlotFilterToCalculations
      });

    const bestResult = perSource.bestResult;
    const bestSpec = perSource.bestSpec;

    rows.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceSortOrder: source.sortOrder,
      currentSpecId: currentSpec.id,
      currentSpecName: currentSpec.name,
      bestSpecId: bestSpec?.id ?? null,
      bestSpecName: bestSpec?.name ?? null,
      currentResult,
      bestResult,
      deltaExactBisChance: bestResult && currentResult ? bestResult.exactBisChance - currentResult.exactBisChance : 0,
      deltaUnluckyChance: bestResult && currentResult ? bestResult.unluckyChance - currentResult.unluckyChance : 0,
      bisExclusiveItems: buildBisExclusiveItems({
        source,
        classDef,
        currentSpec,
        bestSpec,
        items,
        ratingsForCurrentSpec,
        removedItemsForClass,
        slotFilter,
        applySlotFilterToCalculations
      })
    });
  }

  return rows;
}
