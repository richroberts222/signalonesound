const { defineConfig, globalIgnores } = require("eslint/config");
const expoFlat = require("eslint-config-expo/flat");

module.exports = defineConfig([expoFlat, globalIgnores(["dist/**", ".expo/**"])]);
