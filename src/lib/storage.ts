import type { CatalystRating, PersistedAppState, Rating } from "../data/types";
import { STORAGE_KEY, STORAGE_SCHEMA_VERSION } from "../data/types";
import { validatePersistedAppState } from "./validation";

export interface LoadStateResult {
  state: PersistedAppState;
  error?: string;
}

export interface ImportStateResult {
  state?: PersistedAppState;
  error?: string;
}

function toKey(value: number): string {
  return String(value);
}

function migrateRemovedRatingsToClassScope(state: PersistedAppState): PersistedAppState {
  const next = structuredClone(state);
  if (!next.removedByClass) {
    next.removedByClass = {};
  }

  for (const [classId, classRatings] of Object.entries(next.ratings)) {
    for (const [specId, specRatings] of Object.entries(classRatings)) {
      for (const [itemId, entry] of Object.entries(specRatings)) {
        if (entry.rating !== "removed") {
          continue;
        }

        if (!next.removedByClass[classId]) {
          next.removedByClass[classId] = {};
        }

        const existing = next.removedByClass[classId][itemId];
        if (!existing || existing.updatedAt < entry.updatedAt) {
          next.removedByClass[classId][itemId] = {
            removed: true,
            touched: true,
            updatedAt: entry.updatedAt
          };
        }

        // Normalize legacy per-spec removed ratings into class-level storage.
        delete next.ratings[classId][specId][itemId];
      }

      if (Object.keys(next.ratings[classId][specId]).length === 0) {
        delete next.ratings[classId][specId];
      }
    }

    if (Object.keys(next.ratings[classId]).length === 0) {
      delete next.ratings[classId];
    }
  }

  return next;
}

function mapLegacyRating(rating: string): Rating {
  if (rating === "removed") return "removed";
  if (rating === "nice") return "nice";
  if (rating === "bis") return "bis";
  return "ignore";
}

function migrateLegacyRatings(state: PersistedAppState): PersistedAppState {
  const next = structuredClone(state);

  for (const [classId, classRatings] of Object.entries(next.ratings)) {
    for (const [specId, specRatings] of Object.entries(classRatings)) {
      for (const [itemId, entry] of Object.entries(specRatings)) {
        const mapped = mapLegacyRating(String(entry.rating));
        next.ratings[classId][specId][itemId] = {
          ...entry,
          rating: mapped
        };
      }
    }
  }

  if (!next.catalystByClass) {
    next.catalystByClass = {};
  }

  for (const [classId, classValue] of Object.entries(next.catalystByClass)) {
    const entries = Object.entries(classValue);
    const isLegacyClassScoped = entries.length > 0 && entries.every(([, value]) => "rating" in value);
    if (!isLegacyClassScoped) {
      continue;
    }

    const legacySlotMap = classValue as unknown as Record<string, { rating: CatalystRating; touched: boolean; updatedAt: string }>;
    const candidateSpecIds = new Set<string>(Object.keys(next.ratings[classId] ?? {}));
    if (Number(classId) === next.selectedClassId) {
      candidateSpecIds.add(String(next.selectedSpecId));
    }

    if (candidateSpecIds.size === 0) {
      candidateSpecIds.add(String(next.selectedSpecId));
    }

    const bySpec: PersistedAppState["catalystByClass"][string] = {};
    for (const specId of candidateSpecIds) {
      bySpec[specId] = {};
      for (const [slotKey, entry] of Object.entries(legacySlotMap)) {
        bySpec[specId][slotKey] = {
          rating: entry.rating,
          touched: entry.touched,
          updatedAt: entry.updatedAt
        };
      }
    }

    next.catalystByClass[classId] = bySpec;
  }

  return next;
}

export function createDefaultState(dataVersion: string, defaultClassId: number, defaultSpecId: number): PersistedAppState {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    dataVersion,
    selectedClassId: defaultClassId,
    selectedSpecId: defaultSpecId,
    ratings: {},
    removedByClass: {},
    catalystByClass: {}
  };
}

export function loadPersistedState(dataVersion: string, defaultClassId: number, defaultSpecId: number): LoadStateResult {
  const fallback = createDefaultState(dataVersion, defaultClassId, defaultSpecId);

  if (typeof window === "undefined") {
    return { state: fallback };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { state: fallback };
    }

    const parsed: unknown = JSON.parse(raw);
    const validation = validatePersistedAppState(parsed);

    if (!validation.ok || !validation.data) {
      return {
        state: fallback,
        error: `Saved profile data is corrupt and was ignored. ${validation.errors.join(" ")}`
      };
    }

    return {
      state: migrateLegacyRatings(
        migrateRemovedRatingsToClassScope({
          ...validation.data,
          dataVersion
        })
      )
    };
  } catch {
    return {
      state: fallback,
      error: "Saved profile data could not be read and was reset to defaults."
    };
  }
}

export function savePersistedState(state: PersistedAppState): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return undefined;
  } catch {
    return "Failed to save profile data to LocalStorage.";
  }
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore cleanup failure.
  }
}

export function getRatingsForSpec(state: PersistedAppState, classId: number, specId: number): PersistedAppState["ratings"][string][string] {
  return state.ratings[toKey(classId)]?.[toKey(specId)] ?? {};
}

export function getRemovedItemsForClass(
  state: PersistedAppState,
  classId: number
): PersistedAppState["removedByClass"][string] {
  return state.removedByClass[toKey(classId)] ?? {};
}

export function getCatalystRatingsForSpec(
  state: PersistedAppState,
  classId: number,
  specId: number
): PersistedAppState["catalystByClass"][string][string] {
  return state.catalystByClass[toKey(classId)]?.[toKey(specId)] ?? {};
}

export function isItemRemovedForClass(state: PersistedAppState, classId: number, itemId: number): boolean {
  const classRemoved = state.removedByClass[toKey(classId)];
  if (!classRemoved) {
    return false;
  }

  return classRemoved[toKey(itemId)]?.removed === true;
}

export function setItemRemovedForClass(
  state: PersistedAppState,
  classId: number,
  itemId: number,
  removed: boolean,
  updatedAt: string
): PersistedAppState {
  const next = structuredClone(state);
  const classKey = toKey(classId);
  const itemKey = toKey(itemId);

  if (removed) {
    if (!next.removedByClass[classKey]) {
      next.removedByClass[classKey] = {};
    }

    next.removedByClass[classKey][itemKey] = {
      removed: true,
      touched: true,
      updatedAt
    };

    return next;
  }

  if (!next.removedByClass[classKey]) {
    return next;
  }

  if (next.removedByClass[classKey][itemKey]) {
    delete next.removedByClass[classKey][itemKey];
  }

  if (Object.keys(next.removedByClass[classKey]).length === 0) {
    delete next.removedByClass[classKey];
  }

  return next;
}

export function upsertItemRating(
  state: PersistedAppState,
  classId: number,
  specId: number,
  itemId: number,
  rating: Rating,
  updatedAt: string
): PersistedAppState {
  const next = structuredClone(state);
  const classKey = toKey(classId);
  const specKey = toKey(specId);
  const itemKey = toKey(itemId);

  if (!next.ratings[classKey]) {
    next.ratings[classKey] = {};
  }

  if (!next.ratings[classKey][specKey]) {
    next.ratings[classKey][specKey] = {};
  }

  next.ratings[classKey][specKey][itemKey] = {
    rating,
    touched: true,
    updatedAt
  };

  return next;
}

export function setCatalystSlotRatingForSpec(
  state: PersistedAppState,
  classId: number,
  specId: number,
  slotKey: string,
  rating: CatalystRating,
  updatedAt: string
): PersistedAppState {
  const next = structuredClone(state);
  const classKey = toKey(classId);
  const specKey = toKey(specId);

  if (!next.catalystByClass[classKey]) {
    next.catalystByClass[classKey] = {};
  }

  if (!next.catalystByClass[classKey][specKey]) {
    next.catalystByClass[classKey][specKey] = {};
  }

  if (rating === "ignore") {
    if (next.catalystByClass[classKey][specKey][slotKey]) {
      delete next.catalystByClass[classKey][specKey][slotKey];
    }

    if (Object.keys(next.catalystByClass[classKey][specKey]).length === 0) {
      delete next.catalystByClass[classKey][specKey];
    }

    if (Object.keys(next.catalystByClass[classKey]).length === 0) {
      delete next.catalystByClass[classKey];
    }

    return next;
  }

  next.catalystByClass[classKey][specKey][slotKey] = {
    rating,
    touched: true,
    updatedAt
  };

  return next;
}

export function resetRatingsForSpec(state: PersistedAppState, classId: number, specId: number): PersistedAppState {
  const next = structuredClone(state);
  const classKey = toKey(classId);
  const specKey = toKey(specId);

  if (next.ratings[classKey]?.[specKey]) {
    delete next.ratings[classKey][specKey];

    if (Object.keys(next.ratings[classKey]).length === 0) {
      delete next.ratings[classKey];
    }
  }

  if (next.catalystByClass[classKey]?.[specKey]) {
    delete next.catalystByClass[classKey][specKey];

    if (Object.keys(next.catalystByClass[classKey]).length === 0) {
      delete next.catalystByClass[classKey];
    }
  }

  return next;
}

export function hasExplicitRatings(state: PersistedAppState, classId: number, specId: number): boolean {
  const specRatings = state.ratings[toKey(classId)]?.[toKey(specId)];
  if (!specRatings) {
    return false;
  }

  return Object.values(specRatings).some((entry) => entry.touched);
}

export function exportStateAsJson(state: PersistedAppState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(
  rawJson: string,
  currentDataVersion: string,
  defaultClassId: number,
  defaultSpecId: number
): ImportStateResult {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    const validation = validatePersistedAppState(parsed);

    if (!validation.ok || !validation.data) {
      return {
        error: `Import failed validation. ${validation.errors.join(" ")}`
      };
    }

    return {
      state: migrateLegacyRatings(
        migrateRemovedRatingsToClassScope({
          ...validation.data,
          dataVersion: currentDataVersion,
          selectedClassId: validation.data.selectedClassId || defaultClassId,
          selectedSpecId: validation.data.selectedSpecId || defaultSpecId
        })
      )
    };
  } catch {
    return {
      error: "Import file is not valid JSON."
    };
  }
}
