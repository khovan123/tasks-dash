import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full));
    else if (/\.(ts|tsx|mjs|json)$/.test(entry.name)) files.push(full);
  }
  return files;
}

test("runtime no longer contains Google OAuth or Drive integration", async () => {
  const files = [
    ...(await walk(path.join(repoRoot, "apps"))),
    ...(await walk(path.join(repoRoot, "packages"))),
    path.join(repoRoot, ".env.example"),
  ];
  const combined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  for (const token of [
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_REDIRECT_URI",
    "GoogleDriveAdapter",
    "DriveOauthStateService",
    '"google-drive/',
    "driveRootFolderId",
    "components/drive-file-manager",
    'googleDrive: "GOOGLE_DRIVE"',
  ]) {
    assert.equal(combined.includes(token), false, `obsolete Google integration token remains: ${token}`);
  }
});
