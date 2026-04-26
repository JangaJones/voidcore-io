interface ResetRatingsButtonProps {
  onReset: () => void;
}

export function ResetRatingsButton({ onReset }: ResetRatingsButtonProps): JSX.Element {
  const handleClick = (): void => {
    const confirmed = window.confirm(
      "Reset ratings for the currently selected class + specialization only? Class-wide removed items will be kept."
    );
    if (confirmed) {
      onReset();
    }
  };

  return (
    <button className="btn-arcane border-amber-400/45 text-amber-300" onClick={handleClick} type="button">
      Reset Current Spec Ratings
    </button>
  );
}
