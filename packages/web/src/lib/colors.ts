// Authoritative source for the three model colors — also mirrored as
// --color-model-jail/taskforce/wso in packages/web/src/app.css's @theme block
// (Tailwind/CSS can't read this .ts file directly, and Satori bake scripts /
// MapLibre paint expressions consume these hex values directly). Keep the two
// in sync by hand if these ever change.
export const MODEL_COLORS: Record<string, string> = {
  "Jail Enforcement Model": "#BE6079",
  "Task Force Model": "#3C97E2",
  "Warrant Service Officer": "#5E9148",
};

// White text on these three backgrounds used to check at 4.09:1 (jail),
// 3.13:1 (taskforce), 3.74:1 (wso) against WCAG AA's 4.5:1 normal-text
// threshold — all three failed for small badge text. Rather than touch
// MODEL_COLORS (load-bearing for map/legend/chart comprehension), switched
// the text to a warm near-black that clears AA against all three:
// 4.70:1 (jail), 6.15:1 (taskforce), 5.14:1 (wso).
export const MODEL_TEXT_COLORS: Record<string, string> = {
  "Jail Enforcement Model": "#120e09",
  "Task Force Model": "#120e09",
  "Warrant Service Officer": "#120e09",
};

// Dark tints of each model color — for text on light/tinted backgrounds
export const MODEL_DARK_COLORS: Record<string, string> = {
  "Jail Enforcement Model": "#6B1F33",
  "Task Force Model": "#1A4A7A",
  "Warrant Service Officer": "#2F4A22",
};

export const MODEL_ORDER: string[] = [
  "Warrant Service Officer",
  "Jail Enforcement Model",
  "Task Force Model",
];

export const MODEL_SLUG: Record<string, string> = {
  "Jail Enforcement Model": "jail",
  "Task Force Model": "taskforce",
  "Warrant Service Officer": "wso",
};

export const MODEL_SHORT: Record<string, string> = {
  "Jail Enforcement Model": "Jail Enforcement",
  "Task Force Model": "Task Force",
  "Warrant Service Officer": "Warrant Service",
};

export const MODEL_MINI: Record<string, string> = {
  "Jail Enforcement Model": "JEM",
  "Task Force Model": "TFM",
  "Warrant Service Officer": "WSO",
};
