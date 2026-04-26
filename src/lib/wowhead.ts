const WOWHEAD_SCRIPT_ID = "wowhead-tooltips-script";
const WOWHEAD_SCRIPT_URL = "https://wow.zamimg.com/js/tooltips.js";
let wowheadScriptPromise: Promise<void> | null = null;
const MIDNIGHT_S1_MYTHIC_MAX_ILVL = 289;
const MIDNIGHT_S1_BONUS_IDS = [4786, 12806] as const;
const WOWHEAD_DEFAULT_CONFIG = {
  colorLinks: false,
  iconizeLinks: false,
  renameLinks: false
};

declare global {
  interface Window {
    whTooltips?: {
      colorLinks?: boolean;
      iconizeLinks?: boolean;
      renameLinks?: boolean;
    };
    WH?: {
      Tooltips?: {
        refreshLinks?: () => void;
      };
    };
    $WowheadPower?: {
      refreshLinks?: () => void;
    };
  }
}

function runRefresh(): void {
  try {
    window.WH?.Tooltips?.refreshLinks?.();
  } catch {
    // Progressive enhancement fallback.
  }

  try {
    window.$WowheadPower?.refreshLinks?.();
  } catch {
    // Progressive enhancement fallback.
  }
}

export function initWowheadTooltips(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }

  window.whTooltips = window.whTooltips ?? { ...WOWHEAD_DEFAULT_CONFIG };
  // Legacy alias used by older Wowhead integrations.
  (window as unknown as { wowhead_tooltips?: typeof WOWHEAD_DEFAULT_CONFIG }).wowhead_tooltips = {
    colorLinks: window.whTooltips.colorLinks ?? WOWHEAD_DEFAULT_CONFIG.colorLinks,
    iconizeLinks: window.whTooltips.iconizeLinks ?? WOWHEAD_DEFAULT_CONFIG.iconizeLinks,
    renameLinks: window.whTooltips.renameLinks ?? WOWHEAD_DEFAULT_CONFIG.renameLinks
  };

  if (wowheadScriptPromise) {
    return wowheadScriptPromise;
  }

  wowheadScriptPromise = new Promise((resolve) => {
    const existingById = document.getElementById(WOWHEAD_SCRIPT_ID) as HTMLScriptElement | null;
    const existingBySrc = document.querySelector(`script[src="${WOWHEAD_SCRIPT_URL}"]`) as HTMLScriptElement | null;
    const existing = existingById ?? existingBySrc;
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    if (existing && window.WH?.Tooltips?.refreshLinks) {
      existing.dataset.loaded = "true";
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    script.id = WOWHEAD_SCRIPT_ID;
    script.src = WOWHEAD_SCRIPT_URL;
    script.async = false;
    script.defer = false;
    script.crossOrigin = "anonymous";

    const onLoaded = () => {
      script.dataset.loaded = "true";
      runRefresh();
      resolve();
    };

    script.addEventListener("load", onLoaded, { once: true });
    script.addEventListener("error", () => resolve(), { once: true });

    if (!existing) {
      document.body.appendChild(script);
    }
  });

  return wowheadScriptPromise;
}

export function refreshWowheadTooltips(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Defer one frame to make sure newly rendered links are in the DOM.
  window.requestAnimationFrame(() => runRefresh());
  // Fallback pass for slower async script execution.
  window.setTimeout(() => runRefresh(), 120);
}

export function getWowheadItemTooltip(itemId: number): { wowheadUrl: string; dataWowhead: string } {
  const bonusParam = MIDNIGHT_S1_BONUS_IDS.join(":");
  const valueParams = `bonus=${bonusParam}&ilvl=${MIDNIGHT_S1_MYTHIC_MAX_ILVL}`;
  return {
    wowheadUrl: `https://www.wowhead.com/item=${itemId}&${valueParams}`,
    dataWowhead: `item=${itemId}&${valueParams}`
  };
}
