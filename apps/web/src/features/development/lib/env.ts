import type { DevelopmentEnvVar } from "@/features/development/types";

export function recordToEnvRows(
  values: Record<string, string>,
): DevelopmentEnvVar[] {
  return Object.entries(values).map(([key, value]) => ({ key, value }));
}

export function envRowsToRecord(
  rows: DevelopmentEnvVar[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) result[key] = row.value;
  }
  return result;
}

export function serializeEnvRows(rows: DevelopmentEnvVar[]): string {
  return rows
    .filter((row) => row.key.trim())
    .map((row) => `${row.key.trim()}=${row.value}`)
    .join("\n");
}

export function parseEnvText(text: string):
  | { ok: true; rows: DevelopmentEnvVar[] }
  | { ok: false; error: string } {
  const rows: DevelopmentEnvVar[] = [];

  for (const line of text.split("\n")) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const hashIndex = trimmed.indexOf("#");
    if (hashIndex !== -1) {
      const beforeHash = trimmed.slice(0, hashIndex).trim();
      const singleQuotes = (beforeHash.match(/'/g) || []).length;
      const doubleQuotes = (beforeHash.match(/"/g) || []).length;
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        trimmed = beforeHash;
      }
    }

    if (!trimmed) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex <= 0) {
      return {
        ok: false,
        error: "Format import không hợp lệ. Vui lòng kiểm tra lại.",
      };
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if (!key || /\s/.test(key)) {
      return {
        ok: false,
        error: "Tên biến môi trường không được để trống hoặc chứa khoảng trắng.",
      };
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    rows.push({ key, value });
  }

  return { ok: true, rows };
}
