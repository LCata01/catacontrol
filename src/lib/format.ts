export const money = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return "$" + v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const dt = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("es-AR", { hour12: false });
};
