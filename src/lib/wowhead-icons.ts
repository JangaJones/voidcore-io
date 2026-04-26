import type { Role } from "../data/types";

export const WOWHEAD_ICON_BASE = "https://wow.zamimg.com/images/wow/icons/large";

export const CLASS_ICON_NAME_BY_NAME: Record<string, string> = {
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

export const SPEC_ICON_NAME_BY_ID: Record<number, string> = {
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

// Source icon names used to populate local role icons.
export const ROLE_ICON_NAME_BY_ROLE: Record<Role, string> = {
  tank: "ability_warrior_defensivestance",
  healer: "spell_holy_guardianspirit",
  dps: "ability_rogue_eviscerate"
};

function getLocalIconBaseUrl(): string {
  const base = import.meta.env.BASE_URL || "./";
  return `${base}assets/icons`;
}

function getLocalIconUrl(subdir: string, fileName: string): string {
  return `${getLocalIconBaseUrl()}/${subdir}/${fileName}`;
}

export function getRemoteWowheadIconUrl(iconName: string): string {
  return `${WOWHEAD_ICON_BASE}/${iconName}.jpg`;
}

export function getRemoteClassIconUrl(className: string): string | null {
  const iconName = CLASS_ICON_NAME_BY_NAME[className];
  if (!iconName) {
    return null;
  }

  return getRemoteWowheadIconUrl(iconName);
}

export function getRemoteSpecIconUrl(specId: number): string | null {
  const iconName = SPEC_ICON_NAME_BY_ID[specId];
  if (!iconName) {
    return null;
  }

  return getRemoteWowheadIconUrl(iconName);
}

export function getRemoteRoleIconUrl(role: Role): string {
  return getRemoteWowheadIconUrl(ROLE_ICON_NAME_BY_ROLE[role]);
}

export function getClassIconUrl(className: string): string | null {
  const iconName = CLASS_ICON_NAME_BY_NAME[className];
  if (!iconName) {
    return null;
  }

  return getLocalIconUrl("classes", `${iconName}.jpg`);
}

export function getSpecIconUrl(specId: number): string | null {
  const iconName = SPEC_ICON_NAME_BY_ID[specId];
  if (!iconName) {
    return null;
  }

  return getLocalIconUrl("specs", `${iconName}.jpg`);
}

export function getRoleIconUrl(role: Role): string {
  return getLocalIconUrl("roles", `${role}.webp`);
}

export function getItemIconUrl(iconName: string | null): string | null {
  if (!iconName) {
    return null;
  }

  return getLocalIconUrl("items", `${iconName}.jpg`);
}
