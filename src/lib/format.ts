export function formatPercentFromRatio(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatPercentValue(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatSourceType(type: string): string {
  if (type === "mythicPlus") {
    return "Mythic+ Dungeon";
  }

  if (type === "raid") {
    return "Raid Boss";
  }

  if (type === "worldBoss") {
    return "World Boss";
  }

  if (type === "delve") {
    return "Delve";
  }

  if (type === "catalyst") {
    return "Catalyst";
  }

  return type;
}

export function formatPoolStatus(denominator: number): string {
  return denominator === 0 ? "No valid loot pool" : `${denominator} valid items`;
}
