import globals from "globals";
import tseslint from "typescript-eslint";
import lit from "eslint-plugin-lit";
import wc from "eslint-plugin-wc";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Global ignores
  { ignores: ["dev/**/*.js", "node_modules", "dist"] },

  // Base: recommended JS rules
  ...tseslint.configs.recommended,

  // TypeScript-aware rules for src/
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // typescript-eslint overrides
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Lit decorators use !

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Lit plugin
  {
    files: ["src/**/*.ts"],
    plugins: { lit },
    rules: {
      ...lit.configs.recommended.rules,
      "lit/no-useless-template-literals": "error",
      "lit/prefer-nothing": "error",
    },
  },

  // Web Components plugin
  {
    files: ["src/**/*.ts"],
    plugins: { wc },
    rules: {
      ...wc.configs.recommended.rules,
      "wc/guard-super-call": "error",
    },
  },

  // Prettier — must be last to disable conflicting formatting rules
  prettier,
);
