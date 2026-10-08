import tseslint from "typescript-eslint";

// Recommended TypeScript rules only; no stylistic rules (audit F-CODE-001).
export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", "coverage/**"] },
  ...tseslint.configs.recommended,
);
