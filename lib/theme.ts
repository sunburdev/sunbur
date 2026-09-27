export type Theme = "dark" | "light"

export const THEME_STORAGE_KEY = "sunbur-theme"
export const DEFAULT_THEME: Theme = "dark"
/** Browser chrome colour (address bar on mobile) — mirrors `--background` of each theme. */
export const THEME_COLORS: Record<Theme, string> = { dark: "#16171b", light: "#f7f6f2" }

/** Runs in <head> before first paint so a saved light theme never flashes dark. Kept
 *  tiny and dependency-free: it is inlined as a string, not bundled. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t="${DEFAULT_THEME}";document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"${THEME_COLORS.light}":"${THEME_COLORS.dark}")}catch(e){}})()`
