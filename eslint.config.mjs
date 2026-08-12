// @ts-check

import { defineConfig } from "eslint/config";
import std from "@blaahaj/std/eslint";

export default defineConfig({
  files: ["**/*.{js,ts}"],
  extends: [std],
});
