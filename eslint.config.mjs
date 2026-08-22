import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native ESLint 9 flat config arrays (no
// FlatCompat / legacy .eslintrc wrapping needed — that combination
// triggers a circular-JSON crash in @eslint/eslintrc's schema
// validator with this plugin set, so we import the flat configs
// directly instead).
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      // This app's interactive tables (search-as-you-type, live
      // filters, pagination) intentionally fetch data client-side in
      // a `useEffect` keyed off filter state — the standard pattern
      // for that UX, and not reasonably replaced by server-driven
      // rendering without a full rewrite. The React Compiler's
      // stricter "no setState in effect" rule (new default as of
      // Next.js 16 / eslint-plugin-react-hooks 7) flags that
      // deliberate pattern as an error; kept as a visible warning
      // instead of silenced outright.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
