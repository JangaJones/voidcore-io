import type { ClassDefinition } from "../data/types";
import {
  getClassIconUrl,
  getRemoteClassIconUrl,
  getRemoteRoleIconUrl,
  getRemoteSpecIconUrl,
  getRoleIconUrl,
  getSpecIconUrl
} from "../lib/wowhead-icons";

interface ClassSpecSelectorProps {
  classes: ClassDefinition[];
  selectedClassId: number;
  selectedSpecId: number;
  onClassChange: (value: number) => void;
  onSpecChange: (value: number) => void;
}

export function ClassSpecSelector(props: ClassSpecSelectorProps): JSX.Element {
  const { classes, selectedClassId, selectedSpecId, onClassChange, onSpecChange } = props;
  const selectedClass = classes.find((entry) => entry.id === selectedClassId) ?? classes[0];

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-midnight-muted">Class</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {classes.map((classDef) => {
            const selected = classDef.id === selectedClassId;
            const iconUrl = getClassIconUrl(classDef.name);
            const remoteFallbackIconUrl = getRemoteClassIconUrl(classDef.name);
            return (
              <button
                key={classDef.id}
                type="button"
                className={`flex flex-col items-center gap-1 border p-2 text-xs transition ${
                  selected
                    ? "border-midnight-cyan bg-cyan-950/25 text-cyan-100"
                    : "border-slate-700/70 bg-slate-900/35 text-midnight-muted hover:border-slate-500/80"
                }`}
                onClick={() => onClassChange(classDef.id)}
                aria-pressed={selected}
                title={classDef.name}
              >
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    className="h-9 w-9 border border-slate-700/70 object-cover"
                    loading="lazy"
                    onError={(event) => {
                      if (remoteFallbackIconUrl && event.currentTarget.src !== remoteFallbackIconUrl) {
                        event.currentTarget.src = remoteFallbackIconUrl;
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center border border-slate-700/70 text-[10px]">CLS</div>
                )}
                <span className="text-center leading-none">{classDef.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-midnight-muted">Specialization</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {selectedClass.specs.map((spec) => {
            const selected = spec.id === selectedSpecId;
            const iconUrl = getSpecIconUrl(spec.id) ?? getClassIconUrl(selectedClass.name);
            const remoteSpecIconUrl = getRemoteSpecIconUrl(spec.id) ?? getRemoteClassIconUrl(selectedClass.name);
            const roleIconUrl = getRoleIconUrl(spec.role);
            const remoteRoleIconUrl = getRemoteRoleIconUrl(spec.role);
            return (
              <button
                key={spec.id}
                type="button"
                className={`flex items-center justify-between gap-2 border px-2 py-2 text-left text-xs transition ${
                  selected
                    ? "border-midnight-cyan bg-cyan-950/25 text-cyan-100"
                    : "border-slate-700/70 bg-slate-900/35 text-midnight-muted hover:border-slate-500/80"
                }`}
                onClick={() => onSpecChange(spec.id)}
                aria-pressed={selected}
                title={`${spec.name} (${spec.role.toUpperCase()})`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt=""
                      className="h-8 w-8 border border-slate-700/70 object-cover"
                      loading="lazy"
                      onError={(event) => {
                        if (remoteSpecIconUrl && event.currentTarget.src !== remoteSpecIconUrl) {
                          event.currentTarget.src = remoteSpecIconUrl;
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center border border-slate-700/70 text-[10px]">SPC</div>
                  )}
                  <span className="truncate">{spec.name}</span>
                </div>
                <img
                  src={roleIconUrl}
                  alt={spec.role.toUpperCase()}
                  className="h-7 w-7 object-contain opacity-95"
                  loading="lazy"
                  onError={(event) => {
                    if (event.currentTarget.src !== remoteRoleIconUrl) {
                      event.currentTarget.src = remoteRoleIconUrl;
                    }
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
