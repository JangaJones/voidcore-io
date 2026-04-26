import { useEffect, useMemo, useState } from "react";
import lootDbRaw from "./data/voidcore-db.mid-s1.json";
import type {
  ClassDefinition,
  ContentFilter,
  LootItem,
  PersistedAppState,
  Rating,
  RecommendationSortMode
} from "./data/types";
import { AppShell } from "./components/AppShell";
import { CatalystPanel } from "./components/CatalystPanel";
import { ControlBar } from "./components/ControlBar";
import { RatingMatrix } from "./components/RatingMatrix";
import { RecommendationPanel } from "./components/RecommendationPanel";
import { calculateAllSourceValuesForSpec, calculateOverallRecommendation, compareCurrentSpecWithBestSpec } from "./lib/calculations";
import { cycleCatalystRating, getCatalystProfileForSpec, getCatalystSlotEntriesForClass } from "./lib/catalyst";
import { getEligibleSpecsForItem, isItemEligibleForSpec } from "./lib/eligibility";
import { filterSourcesByContent } from "./lib/filters";
import { sortByGlobalSlotOrder } from "./lib/slot-order";
import {
  clearPersistedState,
  createDefaultState,
  exportStateAsJson,
  getCatalystRatingsForSpec,
  getRemovedItemsForClass,
  getRatingsForSpec,
  hasExplicitRatings,
  importStateFromJson,
  loadPersistedState,
  setCatalystSlotRatingForSpec,
  setItemRemovedForClass,
  resetRatingsForSpec,
  savePersistedState,
  upsertItemRating
} from "./lib/storage";
import { validateLootDatabase } from "./lib/validation";
import { initWowheadTooltips, refreshWowheadTooltips } from "./lib/wowhead";

type NoticeType = "error" | "info";

interface Notice {
  type: NoticeType;
  message: string;
}

const dbValidation = validateLootDatabase(lootDbRaw);

function sortSources(a: { sortOrder: number; name: string }, b: { sortOrder: number; name: string }): number {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.name.localeCompare(b.name);
}

function normalizeSelection(state: PersistedAppState, classes: ClassDefinition[]): PersistedAppState {
  const fallbackClass = classes[0];
  const selectedClass = classes.find((entry) => entry.id === state.selectedClassId) ?? fallbackClass;
  const selectedSpec =
    selectedClass.specs.find((entry) => entry.id === state.selectedSpecId) ?? selectedClass.specs[0] ?? null;

  if (!selectedSpec) {
    return state;
  }

  if (selectedClass.id === state.selectedClassId && selectedSpec.id === state.selectedSpecId) {
    return state;
  }

  return {
    ...state,
    selectedClassId: selectedClass.id,
    selectedSpecId: selectedSpec.id
  };
}

export default function App(): JSX.Element {
  if (!dbValidation.ok || !dbValidation.data) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-midnight-silver">
        <h1 className="font-display text-xl">Loot DB Validation Failed</h1>
        <ul className="mt-3 list-disc pl-5 text-sm text-red-300">
          {dbValidation.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  const db = dbValidation.data;
  const fallbackClass = db.classes[0];
  const fallbackSpec = fallbackClass.specs[0];

  const initialLoad = loadPersistedState(db.dataVersion, fallbackClass.id, fallbackSpec.id);
  const [appState, setAppState] = useState<PersistedAppState>(() => normalizeSelection(initialLoad.state, db.classes));
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [recommendationContentFilter, setRecommendationContentFilter] = useState<ContentFilter>("all");
  const [recommendationSortMode, setRecommendationSortMode] = useState<RecommendationSortMode>("bis");
  const [notice, setNotice] = useState<Notice | null>(
    initialLoad.error ? { type: "error", message: initialLoad.error } : null
  );

  const selectedClass = useMemo(
    () => db.classes.find((entry) => entry.id === appState.selectedClassId) ?? fallbackClass,
    [appState.selectedClassId, db.classes, fallbackClass]
  );

  const selectedSpec = useMemo(
    () => selectedClass.specs.find((entry) => entry.id === appState.selectedSpecId) ?? selectedClass.specs[0],
    [appState.selectedSpecId, selectedClass]
  );

  useEffect(() => {
    setAppState((previous) => normalizeSelection(previous, db.classes));
  }, [db.classes]);

  useEffect(() => {
    const saveError = savePersistedState(appState);
    if (saveError) {
      setNotice({ type: "error", message: saveError });
    }
  }, [appState]);

  useEffect(() => {
    initWowheadTooltips();
  }, []);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [appState.ratings, appState.removedByClass, appState.catalystByClass, selectedClass.id, selectedSpec.id, contentFilter]);

  const selectedSpecItems = useMemo(
    () => db.items.filter((item) => isItemEligibleForSpec(item, selectedSpec, selectedClass)),
    [db.items, selectedClass, selectedSpec]
  );

  const filteredSources = useMemo(
    () => filterSourcesByContent(db.sources, contentFilter).sort(sortSources),
    [contentFilter, db.sources]
  );

  const currentSpecRatings = getRatingsForSpec(appState, selectedClass.id, selectedSpec.id);
  const removedItemsForCurrentClass = getRemovedItemsForClass(appState, selectedClass.id);
  const catalystRatingsForCurrentSpec = getCatalystRatingsForSpec(appState, selectedClass.id, selectedSpec.id);
  const catalystProfileForCurrentSpec = getCatalystProfileForSpec(appState, selectedClass.id, selectedSpec.id);
  const catalystSlotEntries = useMemo(
    () => getCatalystSlotEntriesForClass(db.catalystItems, selectedClass.id),
    [db.catalystItems, selectedClass.id]
  );
  const currentClassHasRemovedItems = Object.values(removedItemsForCurrentClass).some(
    (entry) => entry.touched && entry.removed
  );
  const currentSpecHasCatalystRatings = Object.values(catalystRatingsForCurrentSpec).some(
    (entry) => entry.touched && (entry.rating === "nice" || entry.rating === "bis")
  );
  const currentSpecHasExplicitRatings =
    hasExplicitRatings(appState, selectedClass.id, selectedSpec.id) ||
    currentClassHasRemovedItems ||
    currentSpecHasCatalystRatings;

  const sourceResultsForCurrentSpec = useMemo(
    () =>
      calculateAllSourceValuesForSpec({
        sources: db.sources,
        spec: selectedSpec,
        classDef: selectedClass,
        items: db.items,
        ratingsForSpec: currentSpecRatings,
        removedItemsForClass: removedItemsForCurrentClass,
        catalystRatingsForSpec: catalystRatingsForCurrentSpec,
        contentFilter,
        sortMode: recommendationSortMode,
        preferredSpecId: selectedSpec.id,
        isDefaultProfile: !currentSpecHasExplicitRatings
      }),
    [
      contentFilter,
      currentSpecHasExplicitRatings,
      currentSpecRatings,
      db.items,
      db.sources,
      catalystRatingsForCurrentSpec,
      removedItemsForCurrentClass,
      recommendationSortMode,
      selectedClass,
      selectedSpec.id
    ]
  );

  const sourceResultsById = useMemo(
    () =>
      sourceResultsForCurrentSpec.reduce<Record<string, (typeof sourceResultsForCurrentSpec)[number]>>((acc, entry) => {
        acc[entry.sourceId] = entry;
        return acc;
      }, {}),
    [sourceResultsForCurrentSpec]
  );

  const itemsBySource = useMemo(() => {
    const map: Record<string, typeof selectedSpecItems> = {};

    for (const source of filteredSources) {
      map[source.id] = sortByGlobalSlotOrder(selectedSpecItems.filter((item) => item.sourceId === source.id));
    }

    return map;
  }, [filteredSources, selectedSpecItems]);

  const recommendation = useMemo(
    () =>
      calculateOverallRecommendation({
        classDef: selectedClass,
        sources: db.sources,
        items: db.items,
        ratingsByClass: appState.ratings,
        removedByClass: appState.removedByClass,
        catalystByClass: appState.catalystByClass,
        currentSpecId: selectedSpec.id,
        contentFilter: recommendationContentFilter,
        sortMode: recommendationSortMode
      }),
    [
      appState.ratings,
      appState.removedByClass,
      appState.catalystByClass,
      db.items,
      db.sources,
      recommendationContentFilter,
      recommendationSortMode,
      selectedClass,
      selectedSpec.id
    ]
  );

  const comparisonRows = useMemo(
    () =>
      compareCurrentSpecWithBestSpec({
        classDef: selectedClass,
        sources: db.sources,
        items: db.items,
        ratingsByClass: appState.ratings,
        removedByClass: appState.removedByClass,
        catalystByClass: appState.catalystByClass,
        currentSpecId: selectedSpec.id,
        contentFilter,
        sortMode: recommendationSortMode
      }),
    [
      appState.ratings,
      appState.removedByClass,
      appState.catalystByClass,
      contentFilter,
      db.items,
      db.sources,
      recommendationSortMode,
      selectedClass,
      selectedSpec.id
    ]
  );

  const comparisonBySourceId = useMemo(
    () =>
      comparisonRows.reduce<Record<string, (typeof comparisonRows)[number]>>((acc, row) => {
        acc[row.sourceId] = row;
        return acc;
      }, {}),
    [comparisonRows]
  );

  const getItemSpecLabels = (item: LootItem): string[] => {
    const specs = getEligibleSpecsForItem(item, selectedClass);
    return specs.map((spec) => spec.name);
  };

  const getItemRating = (itemId: number): Rating => {
    if (removedItemsForCurrentClass[String(itemId)]?.removed) {
      return "removed";
    }

    const explicit = currentSpecRatings[String(itemId)]?.rating;
    if (explicit === "removed" || explicit === "nice" || explicit === "bis" || explicit === "ignore") {
      return explicit;
    }

    return "ignore";
  };

  const getItemCatalystState = (item: LootItem): "inactive" | "active-nice" | "active-bis" | "overridden" => {
    if (!item.catalystEligible || !item.catalystSlotKey) {
      return "inactive";
    }

    const explicit = getItemRating(item.id);
    const catalystRating = catalystProfileForCurrentSpec[item.catalystSlotKey]?.rating ?? "ignore";

    if (explicit === "removed" || explicit === "nice" || explicit === "bis") {
      return catalystRating === "ignore" ? "inactive" : "overridden";
    }

    if (catalystRating === "bis") {
      return "active-bis";
    }

    if (catalystRating === "nice") {
      return "active-nice";
    }

    return "inactive";
  };

  const handleClassChange = (classId: number): void => {
    const classDef = db.classes.find((entry) => entry.id === classId);
    if (!classDef) {
      return;
    }

    setAppState((previous) => {
      const specStillValid = classDef.specs.some((spec) => spec.id === previous.selectedSpecId);
      return {
        ...previous,
        selectedClassId: classDef.id,
        selectedSpecId: specStillValid ? previous.selectedSpecId : classDef.specs[0]?.id ?? previous.selectedSpecId
      };
    });
  };

  const handleSpecChange = (specId: number): void => {
    setAppState((previous) => ({
      ...previous,
      selectedSpecId: specId
    }));
  };

  const handleRateItem = (itemId: number, rating: Rating): void => {
    setAppState((previous) => {
      const now = new Date().toISOString();

      if (rating === "removed") {
        return setItemRemovedForClass(previous, selectedClass.id, itemId, true, now);
      }

      const withoutRemoved = setItemRemovedForClass(previous, selectedClass.id, itemId, false, now);
      return upsertItemRating(withoutRemoved, selectedClass.id, selectedSpec.id, itemId, rating, now);
    });
  };

  const handleToggleItemRemoved = (itemId: number, removed: boolean): void => {
    setAppState((previous) => {
      const now = new Date().toISOString();
      const updated = setItemRemovedForClass(previous, selectedClass.id, itemId, removed, now);

      // Legacy compatibility: older profiles may still carry explicit `removed` ratings.
      // When restoring via the Voidcore toggle, convert that explicit value back to `ignore`
      // so class-wide removal state is the single source of truth.
      if (!removed) {
        const explicit = getRatingsForSpec(updated, selectedClass.id, selectedSpec.id)[String(itemId)]?.rating;
        if (explicit === "removed") {
          return upsertItemRating(updated, selectedClass.id, selectedSpec.id, itemId, "ignore", now);
        }
      }

      return updated;
    });
  };

  const handleCycleCatalystSlot = (slotKey: string): void => {
    setAppState((previous) => {
      const current = previous.catalystByClass[String(selectedClass.id)]?.[String(selectedSpec.id)]?.[slotKey]?.rating ?? "ignore";
      const next = cycleCatalystRating(current);
      return setCatalystSlotRatingForSpec(previous, selectedClass.id, selectedSpec.id, slotKey, next, new Date().toISOString());
    });
  };

  const handleResetCurrentSpec = (): void => {
    setAppState((previous) => resetRatingsForSpec(previous, selectedClass.id, selectedSpec.id));
    setNotice({ type: "info", message: `Reset ratings for ${selectedClass.name} ${selectedSpec.name}.` });
  };

  const handleResetAllData = (): void => {
    const confirmed = window.confirm("Reset all saved data for all classes/specs and catalyst profiles?");
    if (!confirmed) {
      return;
    }

    clearPersistedState();
    setAppState(createDefaultState(db.dataVersion, fallbackClass.id, fallbackSpec.id));
    setNotice({ type: "info", message: "All saved data was reset." });
  };

  const handleExport = (): void => {
    const json = exportStateAsJson(appState);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wow-midnight-loot-optimizer-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (rawJson: string): void => {
    const importResult = importStateFromJson(rawJson, db.dataVersion, fallbackClass.id, fallbackSpec.id);
    if (!importResult.state) {
      setNotice({ type: "error", message: importResult.error ?? "Import failed." });
      return;
    }

    setAppState(normalizeSelection(importResult.state, db.classes));
    setNotice({ type: "info", message: "Import completed." });
  };

  const handleRecoverStorage = (): void => {
    clearPersistedState();
    setAppState(createDefaultState(db.dataVersion, fallbackClass.id, fallbackSpec.id));
    setNotice({ type: "info", message: "LocalStorage was reset for this app." });
  };

  const dataFromDate = useMemo(() => {
    const raw = db.sourceLastUpdated ?? db.generatedAt;
    if (typeof raw === "string") {
      const direct = raw.match(/^\d{4}-\d{2}-\d{2}/);
      if (direct) {
        return direct[0];
      }

      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    }

    return "Unknown";
  }, [db.generatedAt, db.sourceLastUpdated]);

  return (
    <AppShell
      title="Voidcore-IO"
      dataFromDate={dataFromDate}
      controls={
        <ControlBar
          classes={db.classes}
          selectedClassId={selectedClass.id}
          selectedSpecId={selectedSpec.id}
          currentSpecHasExplicitRatings={currentSpecHasExplicitRatings}
          onClassChange={handleClassChange}
          onSpecChange={handleSpecChange}
          onResetRatings={handleResetCurrentSpec}
          onResetAllData={handleResetAllData}
          onExport={handleExport}
          onImport={handleImport}
        />
      }
    >
      {notice && (
        <section
          className={`panel-angled p-3 text-sm ${
            notice.type === "error"
              ? "border-red-400/60 bg-red-950/35 text-red-200"
              : "border-cyan-400/50 bg-cyan-950/25 text-cyan-100"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{notice.message}</p>
            <div className="flex gap-2">
              {notice.type === "error" && (
                <button type="button" className="btn-arcane border-red-300/55 text-red-100" onClick={handleRecoverStorage}>
                  Reset Saved Data
                </button>
              )}
              <button type="button" className="btn-arcane" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </section>
      )}

      <RecommendationPanel
        recommendation={recommendation}
        selectedSpecName={selectedSpec.name}
        onSortModeChange={setRecommendationSortMode}
        recommendationContentFilter={recommendationContentFilter}
        onRecommendationContentFilterChange={setRecommendationContentFilter}
      />

      <CatalystPanel
        entries={catalystSlotEntries}
        getSlotRating={(slotKey) => catalystProfileForCurrentSpec[slotKey]?.rating ?? "ignore"}
        onCycleSlotRating={handleCycleCatalystSlot}
      />

      <RatingMatrix
        sources={filteredSources}
        itemsBySource={itemsBySource}
        sourceResultsById={sourceResultsById}
        comparisonBySourceId={comparisonBySourceId}
        contentFilter={contentFilter}
        onContentFilterChange={setContentFilter}
        getItemRating={getItemRating}
        getItemCatalystState={getItemCatalystState}
        onRateItem={handleRateItem}
        onToggleItemRemoved={handleToggleItemRemoved}
        getItemSpecLabels={getItemSpecLabels}
      />
    </AppShell>
  );
}
