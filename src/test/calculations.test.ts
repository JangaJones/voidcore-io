import { describe, expect, it } from "vitest";
import type { ClassDefinition, ClassRatings, LootItem, LootSource, SpecDefinition } from "../data/types";
import { calculateSourceValue, compareCurrentSpecWithBestSpec, getEffectiveLootPool } from "../lib/calculations";
import { isItemEligibleForSpec } from "../lib/eligibility";
import {
  createDefaultState,
  resetRatingsForSpec,
  setCatalystSlotRatingForSpec,
  setItemRemovedForClass,
  upsertItemRating
} from "../lib/storage";

const specA: SpecDefinition = { id: 1001, name: "Spec A", role: "dps", mainStat: "agi", classId: 1, className: "Test Class" };
const specB: SpecDefinition = { id: 1002, name: "Spec B", role: "dps", mainStat: "agi", classId: 1, className: "Test Class" };

const classDef: ClassDefinition = {
  id: 1,
  name: "Test Class",
  armorType: "leather",
  weaponSubclasses: ["dagger", "sword1h"],
  specs: [specA, specB]
};

const source: LootSource = {
  id: "source-1",
  name: "Source One",
  type: "mythicPlus",
  encounterId: 1234,
  instanceId: 999,
  instanceName: "Instance One",
  group: "mythic-plus",
  bonusRollCost: 1,
  sortOrder: 1
};

const items: LootItem[] = [
  {
    id: 101,
    name: "Item A",
    icon: null,
    quality: "epic",
    slot: "trinket",
    armorType: null,
    weaponType: null,
    weaponSubclass: null,
    primaryStatIds: null,
    sourceId: "source-1",
    source: { type: "mythicPlus", name: "Source One", encounterId: 1234 },
    specificRoles: null,
    specs: [1001],
    catalystEligible: false,
    catalystTierType: null,
    catalystSlotKey: null
  },
  {
    id: 102,
    name: "Item B",
    icon: null,
    quality: "epic",
    slot: "finger",
    armorType: null,
    weaponType: null,
    weaponSubclass: null,
    primaryStatIds: null,
    sourceId: "source-1",
    source: { type: "mythicPlus", name: "Source One", encounterId: 1234 },
    specificRoles: null,
    specs: [1001, 1002],
    catalystEligible: false,
    catalystTierType: null,
    catalystSlotKey: null
  },
  {
    id: 103,
    name: "Item C",
    icon: null,
    quality: "epic",
    slot: "neck",
    armorType: null,
    weaponType: null,
    weaponSubclass: null,
    primaryStatIds: null,
    sourceId: "source-1",
    source: { type: "mythicPlus", name: "Source One", encounterId: 1234 },
    specificRoles: null,
    specs: [1002, 9999],
    catalystEligible: false,
    catalystTierType: null,
    catalystSlotKey: null
  }
];

describe("calculation logic", () => {
  it("default all Ignore yields 100% unlucky and zero nice-or-better", () => {
    const result = calculateSourceValue({
      source,
      spec: specA,
      classDef,
      items,
      ratingsForSpec: {}
    });

    expect(result.denominator).toBeGreaterThan(0);
    expect(result.unluckyChance).toBe(1);
    expect(result.niceOrBetterValueChance).toBe(0);
  });

  it("removed items are excluded from denominator", () => {
    const ratingsForSpec: ClassRatings[string][string] = {
      "101": {
        rating: "removed",
        touched: true,
        updatedAt: "2026-04-25T00:00:00.000Z"
      }
    };

    const pool = getEffectiveLootPool({
      source,
      spec: specA,
      classDef,
      items,
      ratingsForSpec
    });

    expect(pool.poolItems.length).toBe(2);
    expect(pool.nonRemovedItems.length).toBe(1);

    const result = calculateSourceValue({
      source,
      spec: specA,
      classDef,
      items,
      ratingsForSpec
    });

    expect(result.denominator).toBe(1);
  });

  it("exact BiS chance counts only BiS-rated items", () => {
    const ratingsForSpec: ClassRatings[string][string] = {
      "101": {
        rating: "bis",
        touched: true,
        updatedAt: "2026-04-25T00:00:00.000Z"
      },
      "102": {
        rating: "nice",
        touched: true,
        updatedAt: "2026-04-25T00:00:00.000Z"
      }
    };

    const result = calculateSourceValue({
      source,
      spec: specA,
      classDef,
      items,
      ratingsForSpec
    });

    expect(result.denominator).toBe(2);
    expect(result.exactBisChance).toBe(0.5);
  });

  it("nice-or-better includes Nice + BiS", () => {
    const ratingsForSpec: ClassRatings[string][string] = {
      "101": {
        rating: "nice",
        touched: true,
        updatedAt: "2026-04-25T00:00:00.000Z"
      },
      "102": {
        rating: "bis",
        touched: true,
        updatedAt: "2026-04-25T00:00:00.000Z"
      }
    };

    const result = calculateSourceValue({
      source,
      spec: specA,
      classDef,
      items,
      ratingsForSpec
    });

    expect(result.denominator).toBe(2);
    expect(result.niceOrBetterValueChance).toBe(1);
  });

  it("class-wide removed items are excluded for all specs of the same class", () => {
    const removedItemsForClass = {
      "102": {
        removed: true,
        touched: true,
        updatedAt: "2026-04-25T00:00:00.000Z"
      }
    };

    const resultSpecA = calculateSourceValue({
      source,
      spec: specA,
      classDef,
      items,
      ratingsForSpec: {},
      removedItemsForClass
    });

    const resultSpecB = calculateSourceValue({
      source,
      spec: specB,
      classDef,
      items,
      ratingsForSpec: {},
      removedItemsForClass
    });

    expect(resultSpecA.denominator).toBe(1);
    expect(resultSpecB.denominator).toBe(1);
  });

  it("spec comparison only considers specs from the same class", () => {
    const ratingsByClass: ClassRatings = {
      "1": {
        "1001": {
          "101": { rating: "ignore", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" },
          "102": { rating: "ignore", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" },
          "103": { rating: "ignore", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" }
        },
        "1002": {
          "102": { rating: "bis", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" },
          "103": { rating: "bis", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" }
        }
      },
      "999": {
        "9999": {
          "103": { rating: "bis", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" }
        }
      }
    };

    const rows = compareCurrentSpecWithBestSpec({
      classDef,
      sources: [source],
      items,
      ratingsByClass,
      removedByClass: {},
      catalystByClass: {},
      currentSpecId: 1001,
      contentFilter: "all"
    });

    expect(rows.length).toBe(1);
    expect([1001, 1002]).toContain(rows[0].bestSpecId);
    expect(rows[0].bestSpecId).not.toBe(9999);
  });

  it("best loot-spec comparison uses current spec rating profile across candidate specs", () => {
    const sourceTwo: LootSource = {
      id: "source-2",
      name: "Source Two",
      type: "raid",
      encounterId: 2222,
      instanceId: 777,
      instanceName: "Raid Two",
      group: "raid",
      bonusRollCost: 2,
      sortOrder: 2
    };

    const comparisonItems: LootItem[] = [
      {
        id: 201,
        name: "Target Item",
        icon: null,
        quality: "epic",
        slot: "trinket",
        armorType: null,
        weaponType: null,
        weaponSubclass: null,
        primaryStatIds: null,
        sourceId: sourceTwo.id,
        source: { type: "raid", name: sourceTwo.name, encounterId: sourceTwo.encounterId },
        specificRoles: null,
        specs: [1001, 1002],
        catalystEligible: false,
        catalystTierType: null,
        catalystSlotKey: null
      },
      {
        id: 202,
        name: "Filler A",
        icon: null,
        quality: "epic",
        slot: "finger",
        armorType: null,
        weaponType: null,
        weaponSubclass: null,
        primaryStatIds: null,
        sourceId: sourceTwo.id,
        source: { type: "raid", name: sourceTwo.name, encounterId: sourceTwo.encounterId },
        specificRoles: null,
        specs: [1001, 1002],
        catalystEligible: false,
        catalystTierType: null,
        catalystSlotKey: null
      },
      {
        id: 203,
        name: "Filler B",
        icon: null,
        quality: "epic",
        slot: "neck",
        armorType: null,
        weaponType: null,
        weaponSubclass: null,
        primaryStatIds: null,
        sourceId: sourceTwo.id,
        source: { type: "raid", name: sourceTwo.name, encounterId: sourceTwo.encounterId },
        specificRoles: null,
        specs: [1001, 1002],
        catalystEligible: false,
        catalystTierType: null,
        catalystSlotKey: null
      },
      {
        id: 204,
        name: "Extra Item Current Spec Only",
        icon: null,
        quality: "epic",
        slot: "waist",
        armorType: null,
        weaponType: null,
        weaponSubclass: null,
        primaryStatIds: null,
        sourceId: sourceTwo.id,
        source: { type: "raid", name: sourceTwo.name, encounterId: sourceTwo.encounterId },
        specificRoles: null,
        specs: [1001],
        catalystEligible: false,
        catalystTierType: null,
        catalystSlotKey: null
      }
    ];

    const ratingsByClass: ClassRatings = {
      "1": {
        "1001": {
          "201": { rating: "bis", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" }
        },
        "1002": {}
      }
    };

    const rows = compareCurrentSpecWithBestSpec({
      classDef,
      sources: [sourceTwo],
      items: comparisonItems,
      ratingsByClass,
      removedByClass: {},
      catalystByClass: {},
      currentSpecId: 1001,
      contentFilter: "all"
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].currentResult?.denominator).toBe(4);
    expect(rows[0].bestResult?.denominator).toBe(3);
    expect(rows[0].bestSpecId).toBe(1002);
    expect(rows[0].deltaExactBisChance).toBeGreaterThan(0);
  });

  it("prefers current spec when all options are ignore and another spec has a smaller pool", () => {
    const sourceThree: LootSource = {
      id: "source-3",
      name: "Source Three",
      type: "mythicPlus",
      encounterId: 3333,
      instanceId: 333,
      instanceName: "Dungeon Three",
      group: "mythic-plus",
      bonusRollCost: 1,
      sortOrder: 3
    };

    const tiedItems: LootItem[] = [
      {
        id: 301,
        name: "Shared A",
        icon: null,
        quality: "epic",
        slot: "trinket",
        armorType: null,
        weaponType: null,
        weaponSubclass: null,
        primaryStatIds: null,
        sourceId: sourceThree.id,
        source: { type: "mythicPlus", name: sourceThree.name, encounterId: sourceThree.encounterId },
        specificRoles: null,
        specs: [1001, 1002],
        catalystEligible: false,
        catalystTierType: null,
        catalystSlotKey: null
      },
      {
        id: 302,
        name: "Shared B",
        icon: null,
        quality: "epic",
        slot: "finger",
        armorType: null,
        weaponType: null,
        weaponSubclass: null,
        primaryStatIds: null,
        sourceId: sourceThree.id,
        source: { type: "mythicPlus", name: sourceThree.name, encounterId: sourceThree.encounterId },
        specificRoles: null,
        specs: [1001, 1002],
        catalystEligible: false,
        catalystTierType: null,
        catalystSlotKey: null
      },
      {
        id: 303,
        name: "Current Extra",
        icon: null,
        quality: "epic",
        slot: "waist",
        armorType: null,
        weaponType: null,
        weaponSubclass: null,
        primaryStatIds: null,
        sourceId: sourceThree.id,
        source: { type: "mythicPlus", name: sourceThree.name, encounterId: sourceThree.encounterId },
        specificRoles: null,
        specs: [1001],
        catalystEligible: false,
        catalystTierType: null,
        catalystSlotKey: null
      }
    ];

    const rows = compareCurrentSpecWithBestSpec({
      classDef,
      sources: [sourceThree],
      items: tiedItems,
      ratingsByClass: { "1": { "1001": {}, "1002": {} } },
      removedByClass: {},
      catalystByClass: {},
      currentSpecId: 1001,
      contentFilter: "all"
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].bestSpecId).toBe(1001);
    expect(rows[0].deltaExactBisChance).toBe(0);
    expect(rows[0].deltaUnluckyChance).toBe(0);
  });

  it("catalyst nice/bis applies when item is not explicitly overridden", () => {
    const catalystItem: LootItem = {
      id: 401,
      name: "Catalyst Item",
      icon: null,
      quality: "epic",
      slot: "head",
      armorType: "leather",
      weaponType: null,
      weaponSubclass: null,
      primaryStatIds: null,
      sourceId: source.id,
      source: { type: "mythicPlus", name: source.name, encounterId: source.encounterId },
      specificRoles: null,
      specs: null,
      catalystEligible: true,
      catalystTierType: "set",
      catalystSlotKey: "head"
    };

    const result = calculateSourceValue({
      source,
      spec: specA,
      classDef,
      items: [catalystItem],
      ratingsForSpec: {},
      catalystRatingsForSpec: {
        head: { rating: "bis", touched: true, updatedAt: "2026-04-25T00:00:00.000Z" }
      }
    });

    expect(result.denominator).toBe(1);
    expect(result.exactBisChance).toBe(1);
  });

  it("explicit spec items still respect class weapon proficiencies", () => {
    const unusableWeaponForClass: LootItem = {
      id: 501,
      name: "Wand of Not For This Class",
      icon: null,
      quality: "epic",
      slot: "weapon_1h",
      armorType: null,
      weaponType: "oneHand",
      weaponSubclass: "wand",
      primaryStatIds: [5],
      sourceId: source.id,
      source: { type: "mythicPlus", name: source.name, encounterId: source.encounterId },
      specificRoles: null,
      specs: [1001],
      catalystEligible: false,
      catalystTierType: null,
      catalystSlotKey: null
    };

    expect(isItemEligibleForSpec(unusableWeaponForClass, specA, classDef)).toBe(false);

    const result = calculateSourceValue({
      source,
      spec: specA,
      classDef,
      items: [unusableWeaponForClass],
      ratingsForSpec: {}
    });

    expect(result.hasValidPool).toBe(false);
    expect(result.denominator).toBe(0);
  });

  it("spec-level weapon overrides are respected over class-level proficiencies", () => {
    const specWithOverride: SpecDefinition = {
      ...specA,
      weaponSubclasses: ["sword1h"]
    };

    const daggerItem: LootItem = {
      id: 502,
      name: "Dagger Restricted by Spec Override",
      icon: null,
      quality: "epic",
      slot: "weapon_1h",
      armorType: null,
      weaponType: "oneHand",
      weaponSubclass: "dagger",
      primaryStatIds: [3],
      sourceId: source.id,
      source: { type: "mythicPlus", name: source.name, encounterId: source.encounterId },
      specificRoles: null,
      specs: null,
      catalystEligible: false,
      catalystTierType: null,
      catalystSlotKey: null
    };

    expect(classDef.weaponSubclasses.includes("dagger")).toBe(true);
    expect(isItemEligibleForSpec(daggerItem, specWithOverride, classDef)).toBe(false);
    expect(isItemEligibleForSpec(daggerItem, specA, classDef)).toBe(true);
  });
});

describe("storage reset behavior", () => {
  it("resetting current spec leaves other spec ratings and class-level settings untouched", () => {
    let state = createDefaultState("midnight-s1-v1", 1, 1001);

    state = upsertItemRating(state, 1, 1001, 101, "bis", "2026-04-25T00:00:00.000Z");
    state = upsertItemRating(state, 1, 1002, 102, "nice", "2026-04-25T00:00:00.000Z");
    state = setItemRemovedForClass(state, 1, 103, true, "2026-04-25T00:00:00.000Z");
    state = setCatalystSlotRatingForSpec(state, 1, 1001, "head", "nice", "2026-04-25T00:00:00.000Z");

    const reset = resetRatingsForSpec(state, 1, 1001);

    expect(reset.ratings["1"]?.["1001"]).toBeUndefined();
    expect(reset.ratings["1"]?.["1002"]?.["102"]?.rating).toBe("nice");
    expect(reset.removedByClass["1"]?.["103"]?.removed).toBe(true);
    expect(reset.catalystByClass["1"]?.["1001"]).toBeUndefined();
  });
});
