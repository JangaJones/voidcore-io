import type { ClassDefinition } from "../data/types";
import { ClassSpecSelector } from "./ClassSpecSelector";
import { ImportExportControls } from "./ImportExportControls";
import { ResetRatingsButton } from "./ResetRatingsButton";

interface ControlBarProps {
  classes: ClassDefinition[];
  selectedClassId: number;
  selectedSpecId: number;
  currentSpecHasExplicitRatings: boolean;
  onClassChange: (value: number) => void;
  onSpecChange: (value: number) => void;
  onResetRatings: () => void;
  onResetAllData: () => void;
  onExport: () => void;
  onImport: (rawJson: string) => void;
}

export function ControlBar(props: ControlBarProps): JSX.Element {
  const {
    classes,
    selectedClassId,
    selectedSpecId,
    currentSpecHasExplicitRatings,
    onClassChange,
    onSpecChange,
    onResetRatings,
    onResetAllData,
    onExport,
    onImport
  } = props;

  return (
    <div className="grid gap-4">
      <ClassSpecSelector
        classes={classes}
        selectedClassId={selectedClassId}
        selectedSpecId={selectedSpecId}
        onClassChange={onClassChange}
        onSpecChange={onSpecChange}
      />

      <div className="flex flex-wrap gap-2">
        <ResetRatingsButton onReset={onResetRatings} />
        <button className="btn-arcane border-red-400/55 text-red-200" type="button" onClick={onResetAllData}>
          Reset All Data
        </button>
        <ImportExportControls onExport={onExport} onImport={onImport} />
      </div>

      {!currentSpecHasExplicitRatings && (
        <p className="text-xs uppercase tracking-wide text-amber-300">Current profile is unrated/default.</p>
      )}
    </div>
  );
}
