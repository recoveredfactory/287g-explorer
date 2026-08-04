// Authoritative source for the three model colors — also mirrored as
// --color-model-jail/taskforce/wso in packages/web/src/app.css's @theme block
// (Tailwind/CSS can't read this .ts file directly, and Satori bake scripts /
// MapLibre paint expressions consume these hex values directly). Keep the two
// in sync by hand if these ever change.
// Lightened ~15% toward white from the original #BE6079/#3C97E2/#5E9148 (kept
// as a comment below since the map/legend/chart hues are otherwise
// load-bearing for comprehension — this was a deliberate, requested
// lightening, not a casual tweak). Original: jail #BE6079, taskforce
// #3C97E2, wso #5E9148.
export const MODEL_COLORS: Record<string, string> = {
  "Jail Enforcement Model": "#C8788D",
  "Task Force Model": "#59A7E6",
  "Warrant Service Officer": "#76A263",
};

// White text on these three backgrounds used to fail WCAG AA for small badge
// text. Near-black text clears AA against the current (lightened) MODEL_COLORS
// with room to spare: 5.97:1 (jail), 7.41:1 (taskforce), 6.52:1 (wso).
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
