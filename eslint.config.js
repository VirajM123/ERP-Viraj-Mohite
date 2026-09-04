export default [
  { ignores: ["dist/**", "node_modules/**", "backend/node_modules/**"] },
  {
    files: ["src/**/*.{js,jsx}", "*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: "readonly", document: "readonly", localStorage: "readonly", console: "readonly", alert: "readonly", confirm: "readonly", fetch: "readonly", crypto: "readonly", setTimeout: "readonly", clearTimeout: "readonly", URL: "readonly", Blob: "readonly", FileReader: "readonly", FormData: "readonly" },
    },
  },
];
