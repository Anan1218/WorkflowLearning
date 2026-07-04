export const FIELD_LABELS: Record<string, string> = {
  "principal.name": "Principal name",
  "principal.fein": "Principal FEIN",
  "principal.address": "Principal address",
  "obligee.name": "Obligee name",
  "obligee.address": "Obligee address",
  bond_type: "Bond type",
  bond_amount: "Bond amount",
  working_capital: "Working capital",
  net_worth: "Net worth",
  wip_schedule: "WIP schedule",
  wip_total_contract_value: "WIP total contract value",
  wip_total: "WIP total",
  notes: "Notes",
};

export function fieldLabel(path: string): string {
  const known = FIELD_LABELS[path];
  if (known) return known;

  const words = path
    .replace(/[._]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "fein" || lower === "wip") return lower.toUpperCase();
      return lower;
    });

  if (!words.length) return path;
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ");
}
