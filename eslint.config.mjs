// Dev-only static check. The app itself has no build step and no dependencies;
// this exists because a sprawling single-file app can silently lose a function
// in a refactor — which is exactly how the voice-meal feature broke in v58.
//   npm install && npm run lint
import globals from "globals";

export default [{
  files: ["*.js"],
  languageOptions: {
    ecmaVersion: 2023,
    sourceType: "module",
    globals: { ...globals.browser, supabase: "readonly" }
  },
  rules: {
    // The one that would have caught v58: a call to a function that no longer exists.
    "no-undef": "error",
    "no-dupe-keys": "error",
    "no-dupe-else-if": "error",
    "no-duplicate-case": "error",
    "no-redeclare": "error",
    "no-const-assign": "error",
    "no-func-assign": "error",
    "no-self-assign": "error",
    "no-unsafe-negation": "error",
    "no-unsafe-optional-chaining": "error",
    "use-isnan": "error",
    "valid-typeof": "error",
    "no-unreachable": "warn",
    "no-fallthrough": "warn",
    "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }]
  }
}];
