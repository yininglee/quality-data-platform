import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/runtime/**", "**/docs/previews/**", "**/*.tsbuildinfo"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["data/m3-demo/**/*.mjs"],
    languageOptions: {
      globals: {
        AbortSignal: "readonly",
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        Response: "readonly",
        TextDecoder: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
      },
    },
  },
);
