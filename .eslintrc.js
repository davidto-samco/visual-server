module.exports = {
  env: {
    node: true, // Allows Node.js globals (require, module, process)
    es2021: true, // Allows modern JS syntax
    jest: true, // Allows Jest globals (describe, test, expect)
  },
  extends: "eslint:recommended", // Use ESLint's recommended rules
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    // Error if variable declared but never used (except _prefixed)
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

    // Warn on console.log (remove before production)
    "no-console": "warn",

    // Require semicolons
    semi: ["error", "always"],

    // Require single quotes for strings
    quotes: ["error", "single"],

    // Require 2-space indentation
    indent: ["error", 2],
  },
};
