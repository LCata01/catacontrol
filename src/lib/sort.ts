export function naturalSort<T extends { name: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" })
  );
}
