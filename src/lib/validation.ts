import type {
  CatalystStateEntry,
  LootDatabase,
  PersistedAppState,
  Rating,
  RatingStateEntry,
  RemovedStateEntry
} from "../data/types";
import { RATING_OPTIONS, STORAGE_SCHEMA_VERSION } from "../data/types";

interface ValidationResult<T> {
  ok: boolean;
  errors: string[];
  data?: T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function isRating(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (RATING_OPTIONS.includes(value as Rating) || value === "worthless" || value === "neutral")
  );
}

function isRatingStateEntry(value: unknown): value is { rating: string; touched: boolean; updatedAt: string } {
  if (!isObject(value)) {
    return false;
  }

  return isRating(value.rating) && typeof value.touched === "boolean" && typeof value.updatedAt === "string";
}

function normalizePersistedRating(value: string): Rating {
  if (value === "removed") return "removed";
  if (value === "nice") return "nice";
  if (value === "bis") return "bis";
  return "ignore";
}

function isRemovedStateEntry(value: unknown): value is RemovedStateEntry {
  if (!isObject(value)) {
    return false;
  }

  return typeof value.removed === "boolean" && typeof value.touched === "boolean" && typeof value.updatedAt === "string";
}

function isCatalystStateEntry(value: unknown): value is CatalystStateEntry {
  if (!isObject(value)) {
    return false;
  }

  const rating = value.rating;
  return (
    (rating === "ignore" || rating === "nice" || rating === "bis") &&
    typeof value.touched === "boolean" &&
    typeof value.updatedAt === "string"
  );
}

function normalizeNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}

export function validateLootDatabase(raw: unknown): ValidationResult<LootDatabase> {
  const errors: string[] = [];

  if (!isObject(raw)) {
    return { ok: false, errors: ["Loot database root is not an object."] };
  }

  const candidate = raw as Partial<LootDatabase>;

  if (typeof candidate.schemaVersion !== "number") errors.push("schemaVersion must be a number.");
  if (typeof candidate.dataVersion !== "string") errors.push("dataVersion must be a string.");
  if (typeof candidate.game !== "string") errors.push("game must be a string.");
  if (typeof candidate.expansion !== "string") errors.push("expansion must be a string.");
  if (typeof candidate.season !== "string") errors.push("season must be a string.");
  if (!Array.isArray(candidate.classes)) errors.push("classes must be an array.");
  if (!Array.isArray(candidate.sources)) errors.push("sources must be an array.");
  if (!Array.isArray(candidate.items)) errors.push("items must be an array.");
  if (!Array.isArray(candidate.catalystItems)) errors.push("catalystItems must be an array.");
  if (!isObject(candidate.specIndex)) errors.push("specIndex must be an object.");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  for (const classDef of candidate.classes ?? []) {
    if (!isObject(classDef)) {
      errors.push("class entry is invalid.");
      continue;
    }

    if (typeof classDef.id !== "number" || typeof classDef.name !== "string" || typeof classDef.armorType !== "string") {
      errors.push("class id/name/armorType are required.");
    }
    if (!isStringArray(classDef.weaponSubclasses)) {
      errors.push(`class ${String(classDef.name)} weaponSubclasses must be a string array.`);
    }

    if (!Array.isArray(classDef.specs)) {
      errors.push(`class ${String(classDef.id)} specs must be an array.`);
      continue;
    }

    for (const spec of classDef.specs) {
      if (!isObject(spec) || typeof spec.id !== "number" || typeof spec.name !== "string" || typeof spec.role !== "string") {
        errors.push(`class ${String(classDef.id)} has invalid spec entries.`);
        break;
      }

      if (
        spec.weaponSubclasses !== undefined &&
        spec.weaponSubclasses !== null &&
        !isStringArray(spec.weaponSubclasses)
      ) {
        errors.push(`spec ${String(spec.id)} weaponSubclasses must be null, undefined, or a string array.`);
        break;
      }
    }
  }

  for (const source of candidate.sources ?? []) {
    if (
      !isObject(source) ||
      typeof source.id !== "string" ||
      typeof source.name !== "string" ||
      typeof source.sortOrder !== "number" ||
      typeof source.bonusRollCost !== "number"
    ) {
      errors.push("source entry is invalid.");
      break;
    }
  }

  for (const item of candidate.items ?? []) {
    if (!isObject(item) || typeof item.id !== "number" || typeof item.name !== "string") {
      errors.push("item entry is invalid.");
      break;
    }

    if (typeof item.sourceId !== "string") {
      errors.push(`item ${String(item.id)} has invalid sourceId.`);
      break;
    }

    if (!isObject(item.source) || typeof item.source.type !== "string" || typeof item.source.name !== "string") {
      errors.push(`item ${String(item.id)} has invalid source object.`);
      break;
    }

    if (!(item.specs === null || item.specs === undefined || isNumberArray(item.specs))) {
      errors.push(`item ${String(item.id)} has invalid specs.`);
      break;
    }

    if (typeof item.catalystEligible !== "boolean") {
      errors.push(`item ${String(item.id)} has invalid catalystEligible.`);
      break;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [], data: candidate as LootDatabase };
}

export function validatePersistedAppState(raw: unknown): ValidationResult<PersistedAppState> {
  const errors: string[] = [];

  if (!isObject(raw)) {
    return { ok: false, errors: ["Saved data root is not an object."] };
  }

  const schemaVersion = raw.schemaVersion;
  const dataVersion = raw.dataVersion;
  const selectedClassId = normalizeNumericId(raw.selectedClassId);
  const selectedSpecId = normalizeNumericId(raw.selectedSpecId);
  const ratings = raw.ratings;
  const removedByClass = raw.removedByClass;
  const catalystByClass = raw.catalystByClass;

  if (schemaVersion !== STORAGE_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion. Expected ${STORAGE_SCHEMA_VERSION}.`);
  }
  if (typeof dataVersion !== "string") errors.push("dataVersion must be a string.");
  if (selectedClassId === null) errors.push("selectedClassId must be a number.");
  if (selectedSpecId === null) errors.push("selectedSpecId must be a number.");
  if (!isObject(ratings)) errors.push("ratings must be an object.");
  if (removedByClass !== undefined && !isObject(removedByClass)) errors.push("removedByClass must be an object.");
  if (catalystByClass !== undefined && !isObject(catalystByClass)) errors.push("catalystByClass must be an object.");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const safeDataVersion = dataVersion as string;
  const safeRatings = ratings as Record<string, unknown>;
  const safeRemovedByClass = (isObject(removedByClass) ? removedByClass : {}) as Record<string, unknown>;
  const safeCatalystByClass = (isObject(catalystByClass) ? catalystByClass : {}) as Record<string, unknown>;

  const typedRatings: PersistedAppState["ratings"] = {};
  const typedRemovedByClass: PersistedAppState["removedByClass"] = {};
  const typedCatalystByClass: PersistedAppState["catalystByClass"] = {};

  for (const [classId, classValue] of Object.entries(safeRatings)) {
    if (!isObject(classValue)) {
      errors.push(`ratings.${classId} must be an object.`);
      continue;
    }

    typedRatings[classId] = {};

    for (const [specId, specValue] of Object.entries(classValue)) {
      if (!isObject(specValue)) {
        errors.push(`ratings.${classId}.${specId} must be an object.`);
        continue;
      }

      typedRatings[classId][specId] = {};

      for (const [itemId, itemValue] of Object.entries(specValue)) {
        if (!isRatingStateEntry(itemValue)) {
          errors.push(`ratings.${classId}.${specId}.${itemId} has invalid rating entry.`);
          continue;
        }

        typedRatings[classId][specId][itemId] = {
          rating: normalizePersistedRating(itemValue.rating),
          touched: itemValue.touched,
          updatedAt: itemValue.updatedAt
        } satisfies RatingStateEntry;
      }
    }
  }

  for (const [classId, classValue] of Object.entries(safeRemovedByClass)) {
    if (!isObject(classValue)) {
      errors.push(`removedByClass.${classId} must be an object.`);
      continue;
    }

    typedRemovedByClass[classId] = {};

    for (const [itemId, itemValue] of Object.entries(classValue)) {
      if (!isRemovedStateEntry(itemValue)) {
        errors.push(`removedByClass.${classId}.${itemId} has invalid entry.`);
        continue;
      }

      typedRemovedByClass[classId][itemId] = itemValue;
    }
  }

  for (const [classId, classValue] of Object.entries(safeCatalystByClass)) {
    if (!isObject(classValue)) {
      errors.push(`catalystByClass.${classId} must be an object.`);
      continue;
    }

    typedCatalystByClass[classId] = {};

    const entries = Object.entries(classValue);
    const isLegacyClassScoped = entries.length > 0 && entries.every(([, value]) => isCatalystStateEntry(value));

    if (isLegacyClassScoped) {
      const candidateSpecIds = new Set<string>(Object.keys(typedRatings[classId] ?? {}));
      if (Number(classId) === (selectedClassId as number)) {
        candidateSpecIds.add(String(selectedSpecId as number));
      }
      if (candidateSpecIds.size === 0) {
        candidateSpecIds.add(String(selectedSpecId as number));
      }

      for (const specId of candidateSpecIds) {
        typedCatalystByClass[classId][specId] = {};
        for (const [slotKey, slotValue] of entries) {
          typedCatalystByClass[classId][specId][slotKey] = slotValue as CatalystStateEntry;
        }
      }

      continue;
    }

    for (const [specId, specValue] of entries) {
      if (!isObject(specValue)) {
        errors.push(`catalystByClass.${classId}.${specId} must be an object.`);
        continue;
      }

      typedCatalystByClass[classId][specId] = {};

      for (const [slotKey, slotValue] of Object.entries(specValue)) {
        if (!isCatalystStateEntry(slotValue)) {
          errors.push(`catalystByClass.${classId}.${specId}.${slotKey} has invalid entry.`);
          continue;
        }

        typedCatalystByClass[classId][specId][slotKey] = slotValue;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    data: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      dataVersion: safeDataVersion,
      selectedClassId: selectedClassId as number,
      selectedSpecId: selectedSpecId as number,
      ratings: typedRatings,
      removedByClass: typedRemovedByClass,
      catalystByClass: typedCatalystByClass
    }
  };
}
