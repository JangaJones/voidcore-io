import type { Rating } from "../data/types";
import { RATING_LABELS, RATING_OPTIONS } from "../data/types";

interface RatingSelectorProps {
  value: Rating;
  onChange: (value: Rating) => void;
  disabled?: boolean;
}

export function RatingSelector({ value, onChange, disabled = false }: RatingSelectorProps): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-midnight-muted">Rating</span>
      <select
        className="control-input py-1.5 text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value as Rating)}
        disabled={disabled}
      >
        {RATING_OPTIONS.map((rating) => (
          <option key={rating} value={rating}>
            {RATING_LABELS[rating]}
          </option>
        ))}
      </select>
    </label>
  );
}
