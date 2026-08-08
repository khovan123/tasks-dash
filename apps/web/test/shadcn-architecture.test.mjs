import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const componentsRoot = path.join(sourceRoot, "components");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

const legacySemanticClasses = [
  "app-page",
  "topbar",
  "hero-panel",
  "form-card",
  "data-card",
  "integration-card",
  "empty-state",
  "catalog-card",
  "section-heading",
  "form-grid",
  "danger-button",
  "empty-inline",
  "project-links",
  "table-wrap",
  "inline-links",
  "rule-list",
  "rule-row",
  "member-list",
  "member-row",
  "member-identity",
  "status-pill",
  "link-fieldset",
  "link-row",
  "backlog-list",
  "backlog-row",
  "drag-handle",
  "backlog-main",
  "backlog-actions",
  "catalog-grid",
  "tag-list",
  "drive-toolbar",
  "drive-tree",
  "drive-row",
  "drive-icon",
  "drive-main",
  "drive-actions",
  "github-links",
  "github-pr",
  "github-pr-head",
  "pr-status",
  "github-meta-row",
  "github-commits",
];

function sourceLayer(file) {
  const relative = path.relative(componentsRoot, file).replaceAll(path.sep, "/");
  const layer = relative.split("/")[0];
  return ["atoms", "molecules", "organisms", "templates"].includes(layer)
    ? layer
    : null;
}

const layerRank = {
  atoms: 0,
  molecules: 1,
  organisms: 2,
  templates: 3,
};

test("web UI is Tailwind, shadcn and Atomic Design source-first", async () => {
  const files = await walk(sourceRoot);
  const sourceFiles = files.filter((file) => /\.(tsx?|css)$/.test(file));
  const cssFiles = files
    .filter((file) => file.endsWith(".css"))
    .map((file) => path.relative(sourceRoot, file).replaceAll(path.sep, "/"));

  assert.deepEqual(cssFiles, ["app/globals.css"]);

  const globalsPath = path.join(sourceRoot, "app/globals.css");
  const globals = await readFile(globalsPath, "utf8");
  assert.match(globals, /@import "tailwindcss"/);
  assert.match(globals, /@theme inline/);

  for (const token of legacySemanticClasses) {
    const cssClassPattern = new RegExp(`\\.${token}(?:\\s|\\{|:|,)`);
    assert.equal(
      cssClassPattern.test(globals),
      false,
      `legacy semantic CSS class remains: ${token}`,
    );
  }

  for (const layer of ["atoms", "molecules", "organisms", "templates"]) {
    assert.equal(
      files.some((file) => sourceLayer(file) === layer),
      true,
      `missing Atomic Design layer: components/${layer}`,
    );
  }

  for (const component of [
    "button.tsx",
    "card.tsx",
    "field.tsx",
    "input.tsx",
    "native-select.tsx",
    "table.tsx",
  ]) {
    assert.equal(
      files.some((file) => file.endsWith(path.join("components", "ui", component))),
      true,
      `missing shadcn component source: ${component}`,
    );
  }

  const atomicFiles = sourceFiles.filter((file) => sourceLayer(file));
  for (const file of atomicFiles) {
    const layer = sourceLayer(file);
    const content = await readFile(file, "utf8");
    const imports = content.matchAll(
      /from\s+["']@\/components\/(atoms|molecules|organisms|templates)\//g,
    );

    for (const match of imports) {
      const targetLayer = match[1];
      assert.equal(
        layerRank[targetLayer] <= layerRank[layer],
        true,
        `${layer} cannot depend upward on ${targetLayer}: ${path.relative(sourceRoot, file)}`,
      );
    }
  }
});
