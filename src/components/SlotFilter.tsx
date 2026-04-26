import type { SlotFilterValue } from "../data/types";

interface SlotFilterProps {
  slots: string[];
  value: SlotFilterValue;
  onChange: (value: SlotFilterValue) => void;
}

export function SlotFilter({ slots, value, onChange }: SlotFilterProps): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-midnight-muted">Slot Filter</span>
      <select className="control-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All Slots</option>
        {slots.map((slot) => (
          <option key={slot} value={slot}>
            {slot}
          </option>
        ))}
      </select>
    </label>
  );
}
