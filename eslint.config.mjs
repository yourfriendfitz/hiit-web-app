import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "public/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.js"],
    plugins: {
      "unused-imports": unusedImports,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        IDBKeyRange: "readonly",
        Toastify: "readonly",
      },
    },
    rules: {
      "no-useless-assignment": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^(updateCache|triggerUpdateCache)$",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["app.js"],
    languageOptions: {
      globals: {
        triggerUpdateCache: "readonly",
      },
    },
  },
  {
    files: ["Header.js", "History.js", "LastWeight.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        dbInstance: "readonly",
        getWeight: "readonly",
        initDB: "readonly",
        weightStore: "readonly",
      },
    },
  },
  {
    files: ["service-worker.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        navigator: "readonly",
      },
    },
    rules: {
      "no-redeclare": "off",
    },
  },
  {
    files: ["*.config.mjs", "eslint.config.mjs", "tests/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
];
