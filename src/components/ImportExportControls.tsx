import { useRef } from "react";

interface ImportExportControlsProps {
  onExport: () => void;
  onImport: (rawJson: string) => void;
}

export function ImportExportControls({ onExport, onImport }: ImportExportControlsProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const text = await file.text();
    onImport(text);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn-arcane" type="button" onClick={onExport}>
        Export Ratings JSON
      </button>
      <button className="btn-arcane" type="button" onClick={handleImportClick}>
        Import Ratings JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportChange}
      />
    </div>
  );
}
