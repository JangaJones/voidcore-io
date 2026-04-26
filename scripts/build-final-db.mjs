import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SOURCE_DIR = resolve(ROOT, "src/data/source-of-truth");
const OUTPUT_FILE = resolve(ROOT, "src/data/voidcore-db.mid-s1.json");

const CLASS_ARMOR = {
  "Death Knight": "plate",
  "Demon Hunter": "leather",
  Druid: "leather",
  Evoker: "mail",
  Hunter: "mail",
  Mage: "cloth",
  Monk: "leather",
  Paladin: "plate",
  Priest: "cloth",
  Rogue: "leather",
  Shaman: "mail",
  Warlock: "cloth",
  Warrior: "plate"
};

const CLASS_WEAPON_SUBCLASSES = {
  "Death Knight": ["axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm"],
  "Demon Hunter": ["axe1h", "sword1h", "warglaive", "fist", "dagger"],
  Druid: ["mace1h", "mace2h", "polearm", "staff", "fist", "dagger", "offhand"],
  Evoker: ["axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "staff", "fist", "dagger", "offhand"],
  Hunter: ["axe1h", "axe2h", "sword1h", "sword2h", "polearm", "staff", "fist", "dagger", "bow", "gun", "crossbow"],
  Mage: ["sword1h", "dagger", "staff", "wand", "offhand"],
  Monk: ["axe1h", "mace1h", "sword1h", "fist", "polearm", "staff", "offhand"],
  Paladin: ["axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm", "shield"],
  Priest: ["mace1h", "dagger", "staff", "wand", "offhand"],
  Rogue: ["axe1h", "mace1h", "sword1h", "fist", "dagger"],
  Shaman: ["axe1h", "axe2h", "mace1h", "mace2h", "fist", "dagger", "staff", "shield", "offhand"],
  Warlock: ["sword1h", "dagger", "staff", "wand", "offhand"],
  Warrior: ["axe1h", "axe2h", "mace1h", "mace2h", "sword1h", "sword2h", "polearm", "staff", "fist", "dagger", "shield"]
};

const PRIMARY_STAT_ID_SET = new Set([3, 4, 5, 71, 72, 73, 74]);
const CATALYST_SET_SLOTS = new Set(["head", "shoulder", "chest", "hands", "legs"]);
const CATALYST_OFF_SET_SLOTS = new Set(["back", "wrist", "waist", "feet"]);
const CATALYST_CLASS_CODE = {
  Wra: "Warrior",
  Pal: "Paladin",
  DK: "Death Knight",
  Sha: "Shaman",
  Hun: "Hunter",
  Evo: "Evoker",
  Rog: "Rogue",
  Mon: "Monk",
  Dru: "Druid",
  DH: "Demon Hunter",
  War: "Warlock",
  Pri: "Priest",
  Mag: "Mage"
};

const CLASS_NAME_ALIASES = {
  deathknight: "Death Knight",
  demonhunter: "Demon Hunter"
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapRole(roleType) {
  const normalized = String(roleType || "").toUpperCase();
  if (normalized === "TANK") return "tank";
  if (normalized === "HEALING" || normalized === "HEALER") return "healer";
  return "dps";
}

function mapMainStat(primaryStatType) {
  const normalized = String(primaryStatType || "").toUpperCase();
  if (normalized === "STRENGTH") return "str";
  if (normalized === "AGILITY") return "agi";
  if (normalized === "INTELLECT") return "int";
  return null;
}

function sourceIdFrom(source) {
  if (source.type === "mythicPlus") {
    return `mythicplus-${slug(source.name)}`;
  }

  if (source.type === "raid") {
    const encounter = source.encounterId == null ? "na" : String(source.encounterId);
    return `raid-${slug(source.name)}-${encounter}`;
  }

  const encounter = source.encounterId == null ? "na" : String(source.encounterId);
  return `${slug(source.type)}-${slug(source.name)}-${encounter}`;
}

function normalizeSourceType(type) {
  return String(type || "");
}

function mapGroupFromType(type) {
  if (type === "mythicPlus") return "mythic-plus";
  if (type === "raid") return "raid";
  return "other";
}

function mapCatalystTierType(slot) {
  const normalized = String(slot || "").toLowerCase();
  if (CATALYST_SET_SLOTS.has(normalized)) return "set";
  if (CATALYST_OFF_SET_SLOTS.has(normalized)) return "off-set";
  return null;
}

function inferClassFromCatalystSourceName(sourceName) {
  const match = /Catalyst\s*\(([^)]+)\)/i.exec(String(sourceName || ""));
  if (!match) {
    return null;
  }

  return CATALYST_CLASS_CODE[match[1]] ?? null;
}

function normalizeClassName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const key = raw.toLowerCase().replace(/\s+/g, "");
  return CLASS_NAME_ALIASES[key] ?? raw;
}

function buildClassSpecData(specsRaw) {
  const classesById = new Map();

  for (const spec of Object.values(specsRaw.specializationsById || {})) {
    const classId = Number(spec?.playable_class?.id);
    const className = String(spec?.playable_class?.name || "");
    const specId = Number(spec?.id);
    const specName = String(spec?.name || "");

    if (!Number.isFinite(classId) || !Number.isFinite(specId) || !className || !specName) {
      continue;
    }

    if (!classesById.has(classId)) {
      classesById.set(classId, {
        id: classId,
        name: className,
        armorType: CLASS_ARMOR[className] ?? "unknown",
        weaponSubclasses: CLASS_WEAPON_SUBCLASSES[className] ?? [],
        specs: []
      });
    }

    classesById.get(classId).specs.push({
      id: specId,
      name: specName,
      role: mapRole(spec?.role?.type),
      mainStat: mapMainStat(spec?.primary_stat_type?.type),
      classId,
      className
    });
  }

  const classes = [...classesById.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const classDef of classes) {
    classDef.specs.sort((a, b) => a.id - b.id);
  }

  const specIndex = {};
  for (const classDef of classes) {
    for (const spec of classDef.specs) {
      specIndex[String(spec.id)] = spec;
    }
  }

  return { classes, specIndex };
}

function buildEncounterInstanceMaps(instancesRaw) {
  const encounterMeta = new Map();
  const instanceMeta = new Map();

  for (const [id, instance] of Object.entries(instancesRaw)) {
    const instanceId = Number(id);
    if (!Number.isFinite(instanceId)) continue;

    const entry = {
      id: instanceId,
      name: String(instance?.name || ""),
      orderIndex: Number.isFinite(instance?.order_index) ? Number(instance.order_index) : 999
    };
    instanceMeta.set(instanceId, entry);

    const encounters = Array.isArray(instance?.encounters) ? instance.encounters : [];
    encounters.forEach((enc, idx) => {
      const encounterId = Number(enc?.id);
      if (!Number.isFinite(encounterId)) return;
      encounterMeta.set(encounterId, {
        id: encounterId,
        name: String(enc?.name || ""),
        instanceId,
        instanceName: entry.name,
        position: idx + 1
      });
    });
  }

  return { encounterMeta, instanceMeta };
}

function buildScopeSets(s1Summary) {
  const activeMplusNames = new Set(
    (s1Summary.activeMythicPlusDungeons || []).map((entry) => String(entry.name))
  );

  const activeRaidInstanceIds = new Set(
    (s1Summary.midnightRaidInstances || [])
      .map((entry) => Number(entry.journalInstanceId))
      .filter((id) => Number.isFinite(id))
  );

  return { activeMplusNames, activeRaidInstanceIds };
}

function buildSources(itemsRaw, s1Summary, encounterMeta, instanceMeta) {
  const sourceSeed = new Map();

  for (const item of itemsRaw) {
    const rawSource = item?.source || {};
    const source = {
      type: normalizeSourceType(rawSource.type),
      name: String(rawSource.name || ""),
      encounterId: Number.isFinite(rawSource.encounterId) ? Number(rawSource.encounterId) : null
    };
    const id = sourceIdFrom(source);
    if (!sourceSeed.has(id)) {
      sourceSeed.set(id, source);
    }
  }

  const mplusOrder = new Map();
  (s1Summary.activeMythicPlusDungeons || []).forEach((entry, index) => {
    mplusOrder.set(String(entry.name), index + 1);
  });

  const nameOrderByType = new Map();
  const grouped = {};
  for (const source of sourceSeed.values()) {
    const type = source.type;
    if (!grouped[type]) grouped[type] = new Set();
    grouped[type].add(source.name);
  }
  for (const [type, names] of Object.entries(grouped)) {
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    sorted.forEach((name, idx) => {
      nameOrderByType.set(`${type}::${name}`, idx + 1);
    });
  }

  const sources = [...sourceSeed.values()].map((source) => {
    const sourceId = sourceIdFrom(source);
    const encounterInfo = source.encounterId == null ? undefined : encounterMeta.get(source.encounterId);
    const instanceId = encounterInfo?.instanceId ?? null;
    const instanceName =
      encounterInfo?.instanceName ??
      (source.type === "mythicPlus" ? source.name : null);

    let base = 9000;
    let weight = 999;
    const alphaRank = nameOrderByType.get(`${source.type}::${source.name}`) ?? 999;

    if (source.type === "mythicPlus") {
      base = 1000;
      weight = mplusOrder.get(source.name) ?? alphaRank;
    } else if (source.type === "raid") {
      base = 2000;
      const instanceOrder = encounterInfo?.instanceId ? instanceMeta.get(encounterInfo.instanceId)?.orderIndex ?? 999 : 999;
      const encounterOrder = encounterInfo?.position ?? 99;
      weight = (instanceOrder * 100) + encounterOrder;
    }

    return {
      id: sourceId,
      type: source.type,
      name: source.name,
      encounterId: source.encounterId,
      instanceId,
      instanceName,
      group: mapGroupFromType(source.type),
      bonusRollCost: source.type === "raid" ? 2 : 1,
      sortOrder: base + weight
    };
  });

  sources.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  return sources;
}

function normalizeItems(itemsRaw, scopeSets, encounterMeta) {
  const normalized = [];

  for (const item of itemsRaw) {
    const rawType = normalizeSourceType(item?.source?.type);
    const rawName = String(item?.source?.name || "");
    const rawEncounterId = Number.isFinite(item?.source?.encounterId) ? Number(item.source.encounterId) : null;
    let source;

    if (rawType === "mythicPlus") {
      if (!scopeSets.activeMplusNames.has(rawName)) {
        continue;
      }

      source = {
        type: "mythicPlus",
        name: rawName,
        encounterId: null
      };
    } else if (rawType === "raid") {
      if (rawEncounterId === null) {
        continue;
      }

      const encounterInfo = encounterMeta.get(rawEncounterId);
      if (!encounterInfo) {
        continue;
      }

      if (!scopeSets.activeRaidInstanceIds.has(encounterInfo.instanceId)) {
        continue;
      }

      source = {
        type: "raid",
        name: encounterInfo.name || `Encounter ${rawEncounterId}`,
        encounterId: rawEncounterId
      };
    } else {
      continue;
    }

    const specificRoles = Array.isArray(item.specificRoles)
      ? [...new Set(item.specificRoles.map((role) => String(role).toLowerCase()))].sort()
      : null;

    const specs = Array.isArray(item.specs)
      ? [...new Set(item.specs.map((value) => Number(value)).filter((value) => Number.isFinite(value)))].sort((a, b) => a - b)
      : null;

    const primaryStatIds = Array.isArray(item?.stats?.raw)
      ? [
          ...new Set(
            item.stats.raw
              .map((entry) => Number(entry?.id))
              .filter((statId) => Number.isFinite(statId) && PRIMARY_STAT_ID_SET.has(statId))
          )
        ].sort((a, b) => a - b)
      : [];

    const normalizedSlot = String(item.slot || "").toLowerCase();
    const catalystTierType = mapCatalystTierType(normalizedSlot);

    normalized.push({
      id: Number(item.id),
      name: String(item.name),
      icon: item.icon ? String(item.icon) : null,
      quality: String(item.quality || ""),
      slot: normalizedSlot,
      armorType: item.armorType ? String(item.armorType) : null,
      weaponType: item.weaponType ? String(item.weaponType) : null,
      weaponSubclass: item.weaponSubclass ? String(item.weaponSubclass) : null,
      primaryStatIds: primaryStatIds.length > 0 ? primaryStatIds : null,
      sourceId: sourceIdFrom(source),
      source,
      specificRoles,
      specs,
      catalystEligible: catalystTierType !== null,
      catalystTierType,
      catalystSlotKey: catalystTierType ? normalizedSlot : null
    });
  }

  return normalized;
}

function normalizeCatalystItems(itemsRaw, classes) {
  const classByName = new Map(classes.map((classDef) => [classDef.name, classDef]));
  const result = [];

  for (const item of itemsRaw) {
    if (normalizeSourceType(item?.source?.type) !== "catalyst") {
      continue;
    }

    const normalizedSlot = String(item.slot || "").toLowerCase();
    const catalystTierType = mapCatalystTierType(normalizedSlot);
    if (!catalystTierType) {
      continue;
    }

    const classNameFromTier = item?.tierInfo?.class ? normalizeClassName(item.tierInfo.class) : null;
    const className = classNameFromTier ?? inferClassFromCatalystSourceName(item?.source?.name);
    if (!className) {
      continue;
    }

    const classDef = classByName.get(className);
    if (!classDef) {
      continue;
    }

    const raidSource = item?.tierInfo?.raidSource;
    result.push({
      id: Number(item.id),
      name: String(item.name || ""),
      icon: item.icon ? String(item.icon) : null,
      slot: normalizedSlot,
      armorType: item.armorType ? String(item.armorType) : null,
      classId: classDef.id,
      className: classDef.name,
      catalystTierType,
      raidEncounterId: Number.isFinite(raidSource?.encounterId) ? Number(raidSource.encounterId) : null,
      raidEncounterName: raidSource?.name ? String(raidSource.name) : null
    });
  }

  result.sort((a, b) => {
    if (a.classId !== b.classId) return a.classId - b.classId;
    if (a.catalystTierType !== b.catalystTierType) return a.catalystTierType === "set" ? -1 : 1;
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot);
    return a.name.localeCompare(b.name);
  });

  return result;
}

function main() {
  const wlt = readJson(resolve(SOURCE_DIR, "wlt-mid-s1.payload.json"));
  const specsRaw = readJson(resolve(SOURCE_DIR, "blizzard-playable-specializations.official.json"));
  const instancesRaw = readJson(resolve(SOURCE_DIR, "blizzard-s1-scope-instances.json"));
  const s1Summary = readJson(resolve(SOURCE_DIR, "blizzard-s1-scope-summary.json"));

  const { classes, specIndex } = buildClassSpecData(specsRaw);
  const { encounterMeta, instanceMeta } = buildEncounterInstanceMaps(instancesRaw);
  const scopeSets = buildScopeSets(s1Summary);
  const items = normalizeItems(wlt.items || [], scopeSets, encounterMeta);
  const catalystItems = normalizeCatalystItems(wlt.items || [], classes);
  const sources = buildSources(items, s1Summary, encounterMeta, instanceMeta);

  const finalDb = {
    schemaVersion: 3,
    dataVersion: "mid-s1-final-v4",
    game: "World of Warcraft",
    expansion: "Midnight",
    season: "Season 1",
    seasonNumber: Number.isFinite(wlt.season) ? Number(wlt.season) : 1,
    generatedAt: new Date().toISOString(),
    sourceLastUpdated: typeof wlt.lastUpdated === "string" ? wlt.lastUpdated : null,
    classes,
    specIndex,
    sources,
    items,
    catalystItems
  };

  writeFileSync(OUTPUT_FILE, `${JSON.stringify(finalDb, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`Classes: ${classes.length}, Specs: ${Object.keys(specIndex).length}, Sources: ${sources.length}, Items: ${items.length}`);
}

main();
