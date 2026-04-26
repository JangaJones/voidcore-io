import type { ClassDefinition, LootItem, SpecDefinition } from "../data/types";

function hasExplicitSpecRestriction(item: LootItem): boolean {
  return Array.isArray(item.specs) && item.specs.length > 0;
}

function matchesExplicitSpecRestriction(item: LootItem, spec: SpecDefinition): boolean {
  if (!hasExplicitSpecRestriction(item)) {
    return true;
  }

  return item.specs?.includes(spec.id) ?? false;
}

function matchesRoleRestriction(item: LootItem, spec: SpecDefinition): boolean {
  if (!item.specificRoles || item.specificRoles.length === 0) {
    return true;
  }

  return item.specificRoles.includes(spec.role);
}

function matchesArmorRestriction(item: LootItem, classDef: ClassDefinition): boolean {
  if (!item.armorType) {
    return true;
  }

  return item.armorType === classDef.armorType;
}

function matchesWeaponRestriction(item: LootItem, spec: SpecDefinition, classDef: ClassDefinition): boolean {
  if (!item.weaponSubclass) {
    return true;
  }

  const effectiveWeaponSubclasses = Array.isArray(spec.weaponSubclasses) ? spec.weaponSubclasses : classDef.weaponSubclasses;
  return effectiveWeaponSubclasses.includes(item.weaponSubclass);
}

function matchesPrimaryStatRestriction(item: LootItem, spec: SpecDefinition): boolean {
  if (!item.primaryStatIds || item.primaryStatIds.length === 0) {
    return true;
  }

  if (!spec.mainStat) {
    return true;
  }

  const statIds = new Set(item.primaryStatIds);

  if (spec.mainStat === "agi") {
    return statIds.has(3) || statIds.has(71) || statIds.has(72) || statIds.has(73);
  }

  if (spec.mainStat === "int") {
    return statIds.has(5) || statIds.has(71) || statIds.has(73) || statIds.has(74);
  }

  return statIds.has(4) || statIds.has(71) || statIds.has(72) || statIds.has(74);
}

export function isItemEligibleForSpec(item: LootItem, spec: SpecDefinition, classDef: ClassDefinition): boolean {
  if (!matchesExplicitSpecRestriction(item, spec)) {
    return false;
  }

  if (!matchesRoleRestriction(item, spec)) {
    return false;
  }

  if (!matchesArmorRestriction(item, classDef)) {
    return false;
  }

  if (!matchesWeaponRestriction(item, spec, classDef)) {
    return false;
  }

  if (!matchesPrimaryStatRestriction(item, spec)) {
    return false;
  }

  return true;
}

export function getEligibleSpecsForItem(item: LootItem, classDef: ClassDefinition): SpecDefinition[] {
  return classDef.specs.filter((spec) => isItemEligibleForSpec(item, spec, classDef));
}
