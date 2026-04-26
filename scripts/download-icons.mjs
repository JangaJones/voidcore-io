import { mkdirSync, existsSync, createWriteStream, readFileSync, statSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import https from "node:https";

const ROOT = resolve(process.cwd());
const DB_PATH = resolve(ROOT, "src/data/voidcore-db.mid-s1.json");
const OUT_DIR = resolve(ROOT, "public/assets/icons");
const WOWHEAD_ICON_BASE = "https://wow.zamimg.com/images/wow/icons/large";

const CLASS_ICON_NAME_BY_NAME = {
  Warrior: "classicon_warrior",
  Paladin: "classicon_paladin",
  Hunter: "classicon_hunter",
  Rogue: "classicon_rogue",
  Priest: "classicon_priest",
  "Death Knight": "classicon_deathknight",
  Shaman: "classicon_shaman",
  Mage: "classicon_mage",
  Warlock: "classicon_warlock",
  Monk: "classicon_monk",
  Druid: "classicon_druid",
  "Demon Hunter": "classicon_demonhunter",
  Evoker: "classicon_evoker"
};

const SPEC_ICON_NAME_BY_ID = {
  250: "spell_deathknight_bloodpresence",
  251: "spell_deathknight_frostpresence",
  252: "spell_deathknight_unholypresence",
  577: "ability_demonhunter_specdps",
  581: "ability_demonhunter_spectank",
  1480: "ability_demonhunter_specdps",
  102: "spell_nature_starfall",
  103: "ability_druid_catform",
  104: "ability_racial_bearform",
  105: "spell_nature_healingtouch",
  1467: "classicon_evoker_devastation",
  1468: "classicon_evoker_preservation",
  1473: "classicon_evoker_augmentation",
  253: "ability_hunter_bestialdiscipline",
  254: "ability_hunter_focusedaim",
  255: "ability_hunter_camouflage",
  62: "spell_holy_magicalsentry",
  63: "spell_fire_firebolt02",
  64: "spell_frost_frostbolt02",
  268: "spell_monk_brewmaster_spec",
  269: "spell_monk_windwalker_spec",
  270: "spell_monk_mistweaver_spec",
  65: "spell_holy_holybolt",
  66: "ability_paladin_shieldofthetemplar",
  70: "spell_holy_auraoflight",
  256: "spell_holy_powerwordshield",
  257: "spell_holy_guardianspirit",
  258: "spell_shadow_shadowwordpain",
  259: "ability_rogue_eviscerate",
  260: "ability_rogue_waylay",
  261: "ability_stealth",
  262: "spell_nature_lightning",
  263: "spell_shaman_improvedstormstrike",
  264: "spell_nature_magicimmunity",
  265: "spell_shadow_deathcoil",
  266: "spell_shadow_metamorphosis",
  267: "spell_shadow_rainoffire",
  71: "ability_warrior_savageblow",
  72: "ability_warrior_innerrage",
  73: "ability_warrior_defensivestance"
};

// Fallback role icons using canonical WoW ability icons.
const ROLE_ICON_SOURCE = {
  tank: "ability_warrior_defensivestance",
  healer: "spell_holy_guardianspirit",
  dps: "ability_rogue_eviscerate"
};

function ensureDirs() {
  mkdirSync(resolve(OUT_DIR, "classes"), { recursive: true });
  mkdirSync(resolve(OUT_DIR, "specs"), { recursive: true });
  mkdirSync(resolve(OUT_DIR, "roles"), { recursive: true });
  mkdirSync(resolve(OUT_DIR, "items"), { recursive: true });
}

function downloadFile(url, outFile) {
  return new Promise((resolvePromise, rejectPromise) => {
    const stream = createWriteStream(outFile);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          stream.close();
          if (existsSync(outFile)) {
            rmSync(outFile, { force: true });
          }
          rejectPromise(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        response.pipe(stream);
        stream.on("finish", () => {
          stream.close();
          resolvePromise();
        });
      })
      .on("error", (error) => {
        stream.close();
        if (existsSync(outFile)) {
          rmSync(outFile, { force: true });
        }
        rejectPromise(error);
      });
  });
}

async function runWithConcurrency(tasks, limit = 8) {
  const queue = [...tasks];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) continue;
      await task();
    }
  });
  await Promise.all(workers);
}

function collectTasks(db) {
  const tasks = [];
  const missing = [];

  const classIconNames = new Set(Object.values(CLASS_ICON_NAME_BY_NAME));
  const specIconNames = new Set(Object.values(SPEC_ICON_NAME_BY_ID));
  const itemIconNames = new Set(
    [...db.items, ...(db.catalystItems || [])].map((item) => item.icon).filter((icon) => typeof icon === "string")
  );

  const MIN_ICON_BYTES = 256;
  const isValidExistingFile = (path) => {
    if (!existsSync(path)) {
      return false;
    }

    try {
      return statSync(path).size >= MIN_ICON_BYTES;
    } catch {
      return false;
    }
  };

  for (const iconName of classIconNames) {
    const out = resolve(OUT_DIR, "classes", `${iconName}.jpg`);
    if (isValidExistingFile(out)) continue;
    const url = `${WOWHEAD_ICON_BASE}/${iconName}.jpg`;
    tasks.push(async () => {
      try {
        await downloadFile(url, out);
      } catch (error) {
        missing.push({ kind: "class", iconName, error: String(error) });
      }
    });
  }

  for (const iconName of specIconNames) {
    const out = resolve(OUT_DIR, "specs", `${iconName}.jpg`);
    if (isValidExistingFile(out)) continue;
    const url = `${WOWHEAD_ICON_BASE}/${iconName}.jpg`;
    tasks.push(async () => {
      try {
        await downloadFile(url, out);
      } catch (error) {
        missing.push({ kind: "spec", iconName, error: String(error) });
      }
    });
  }

  for (const [role, sourceIconName] of Object.entries(ROLE_ICON_SOURCE)) {
    const out = resolve(OUT_DIR, "roles", `${role}.jpg`);
    if (isValidExistingFile(out)) continue;
    const url = `${WOWHEAD_ICON_BASE}/${sourceIconName}.jpg`;
    tasks.push(async () => {
      try {
        await downloadFile(url, out);
      } catch (error) {
        missing.push({ kind: "role", iconName: sourceIconName, error: String(error) });
      }
    });
  }

  for (const iconName of itemIconNames) {
    const out = resolve(OUT_DIR, "items", `${iconName}.jpg`);
    if (isValidExistingFile(out)) continue;
    const url = `${WOWHEAD_ICON_BASE}/${iconName}.jpg`;
    tasks.push(async () => {
      try {
        await downloadFile(url, out);
      } catch (error) {
        missing.push({ kind: "item", iconName, error: String(error) });
      }
    });
  }

  return { tasks, missing, stats: { classIconNames, specIconNames, itemIconNames } };
}

async function main() {
  ensureDirs();
  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const { tasks, missing, stats } = collectTasks(db);

  console.log(`Queueing downloads: ${tasks.length}`);
  await runWithConcurrency(tasks, 10);

  console.log(`Class icons: ${stats.classIconNames.size}`);
  console.log(`Spec icons: ${stats.specIconNames.size}`);
  console.log(`Item icons: ${stats.itemIconNames.size}`);
  console.log(`Missing: ${missing.length}`);

  if (missing.length > 0) {
    for (const entry of missing.slice(0, 30)) {
      console.log(`[missing:${entry.kind}] ${entry.iconName} -> ${entry.error}`);
    }
    if (missing.length > 30) {
      console.log(`... and ${missing.length - 30} more missing icons`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
