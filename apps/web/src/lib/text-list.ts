export function parseCommaSeparatedValues(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function serializeCommaSeparatedValues(values?: string[]): string {
  return (values ?? []).join(", ");
}
