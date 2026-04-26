import { describe, expect, it } from "vitest";
import dbRaw from "../data/voidcore-db.mid-s1.json";
import type { LootDatabase, MainStat } from "../data/types";
import { isItemEligibleForSpec } from "../lib/eligibility";

function isPrimaryStatCompatible(primaryStatIds: number[] | null, mainStat: MainStat | null): boolean {
  if (!primaryStatIds || primaryStatIds.length === 0 || !mainStat) {
    return true;
  }

  const set = new Set(primaryStatIds);
  if (mainStat === "agi") {
    return set.has(3) || set.has(71) || set.has(72) || set.has(73);
  }

  if (mainStat === "int") {
    return set.has(5) || set.has(71) || set.has(73) || set.has(74);
  }

  return set.has(4) || set.has(71) || set.has(72) || set.has(74);
}

const db = dbRaw as unknown as LootDatabase;

const OFFICIAL_CLASS_WEAPON_SUBCLASSES: Record<string, string[]> = {
  "Death Knight": ["axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm"],
  "Demon Hunter": ["warglaive", "fist", "axe1h", "sword1h"],
  Druid: ["dagger", "fist", "mace1h", "mace2h", "polearm", "staff"],
  Evoker: ["dagger", "fist", "axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "staff"],
  Hunter: ["axe1h", "axe2h", "bow", "crossbow", "dagger", "fist", "gun", "polearm", "staff", "sword1h", "sword2h"],
  Mage: ["wand", "dagger", "sword1h", "staff"],
  Monk: ["fist", "axe1h", "mace1h", "sword1h", "polearm", "staff"],
  Paladin: ["axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm"],
  Priest: ["dagger", "mace1h", "staff", "wand"],
  Rogue: ["dagger", "fist", "axe1h", "mace1h", "sword1h"],
  Shaman: ["dagger", "fist", "axe1h", "axe2h", "mace1h", "mace2h", "staff"],
  Warlock: ["dagger", "sword1h", "staff", "wand"],
  Warrior: ["dagger", "fist", "axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm", "staff"]
};

describe("eligibility audit (real DB)", () => {
  it("matches official class weapon categories", () => {
    const mismatches: Array<{ className: string; extra: string[]; missing: string[] }> = [];

    for (const classDef of db.classes) {
      const expected = new Set(OFFICIAL_CLASS_WEAPON_SUBCLASSES[classDef.name] ?? []);
      const actual = new Set(classDef.weaponSubclasses.filter((entry) => entry !== "shield" && entry !== "offhand"));

      const extra = [...actual].filter((entry) => !expected.has(entry)).sort();
      const missing = [...expected].filter((entry) => !actual.has(entry)).sort();

      if (extra.length > 0 || missing.length > 0) {
        mismatches.push({
          className: classDef.name,
          extra,
          missing
        });
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("enforces primary-stat compatibility for all specs", () => {
    const violations: Array<{ className: string; specName: string; specId: number; itemId: number; itemName: string }> = [];

    for (const classDef of db.classes) {
      for (const spec of classDef.specs) {
        for (const item of db.items) {
          const eligible = isItemEligibleForSpec(item, spec, classDef);
          if (!eligible) {
            continue;
          }

          if (!isPrimaryStatCompatible(item.primaryStatIds, spec.mainStat)) {
            violations.push({
              className: classDef.name,
              specName: spec.name,
              specId: spec.id,
              itemId: item.id,
              itemName: item.name
            });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("excludes Grips of the Dark Viceroy from Devourer", () => {
    const dh = db.classes.find((entry) => entry.name === "Demon Hunter");
    expect(dh).toBeDefined();

    const devourer = dh?.specs.find((entry) => entry.id === 1480);
    expect(devourer).toBeDefined();

    const item = db.items.find((entry) => entry.id === 258524);
    expect(item).toBeDefined();

    const eligible = isItemEligibleForSpec(item!, devourer!, dh!);
    expect(eligible).toBe(false);
  });
});
