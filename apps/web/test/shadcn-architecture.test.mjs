import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

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

test("web UI is Tailwind and shadcn source-first", async () => {
  const files = await walk(sourceRoot);
  const sourceFiles = files.filter((file) => /\.(tsx?|css)$/.test(file));
  const contents = await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")));
  const combined = contents.join("\n");

  const legacyTokens = [
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

  for (const token of legacyTokens) {
    assert.equal(
      combined.includes(token),
      false,
      `legacy semantic CSS token remains: ${token}`,
    );
  }

  assert.equal(combined.includes("components/atoms"), false);
  assert.equal(combined.includes("./github-links.css"), false);
  assert.equal(combined.includes("./drive.css"), false);

  const cssFiles = files
    .filter((file) => file.endsWith(".css"))
    .map((file) => path.relative(sourceRoot, file).replaceAll(path.sep, "/"));
  assert.deepEqual(cssFiles, ["app/globals.css"]);

  const globals = await readFile(path.join(sourceRoot, "app/globals.css"), "utf8");
  assert.match(globals, /@import "tailwindcss"/);
  assert.match(globals, /@theme inline/);

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
});
