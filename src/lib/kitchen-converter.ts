/** Ingredient densities: grams per US cup (236.588 mL). Easy to edit. */
export interface IngredientDef {
  name: string;
  gPerCup: number | null;
  note: string;
  stickG?: number;
}

export const INGREDIENTS: Record<string, IngredientDef> = {
  water: { name: "Water", gPerCup: 236, note: "1 US cup water ≈ 236 g." },
  milk: { name: "Milk", gPerCup: 240, note: "Whole milk, about 240 g per cup." },
  "heavy-cream": { name: "Heavy cream", gPerCup: 238, note: "Heavy / whipping cream, about 238 g per cup." },
  buttermilk: { name: "Buttermilk", gPerCup: 242, note: "Cultured buttermilk, about 242 g per cup." },
  "vegetable-oil": { name: "Vegetable / olive oil", gPerCup: 218, note: "Typical cooking oil density, about 218 g per cup." },
  honey: { name: "Honey", gPerCup: 340, note: "Honey is dense — about 340 g per cup." },
  "maple-syrup": { name: "Maple syrup", gPerCup: 315, note: "Pure maple syrup, about 315 g per cup." },
  molasses: { name: "Molasses", gPerCup: 337, note: "Unsulphured molasses, about 337 g per cup." },
  butter: {
    name: "Butter",
    gPerCup: 227,
    stickG: 113,
    note: "Butter at 227 g per cup. 1 stick = 113 g = ½ cup.",
  },
  "ap-flour": {
    name: "All-purpose flour",
    gPerCup: 125,
    note: "Based on spooned-and-leveled all-purpose flour, 125 g per cup.",
  },
  "bread-flour": { name: "Bread flour", gPerCup: 127, note: "Bread flour, about 127 g per spooned-and-leveled cup." },
  "cake-flour": { name: "Cake flour", gPerCup: 114, note: "Cake flour, about 114 g per spooned-and-leveled cup." },
  "ww-flour": { name: "Whole wheat flour", gPerCup: 120, note: "Whole wheat flour, about 120 g per cup." },
  "almond-flour": { name: "Almond flour", gPerCup: 96, note: "Blanched almond flour, about 96 g per cup." },
  "granulated-sugar": { name: "Granulated sugar", gPerCup: 200, note: "White granulated sugar, 200 g per cup." },
  "brown-sugar": { name: "Brown sugar (packed)", gPerCup: 213, note: "Firmly packed brown sugar, about 213 g per cup." },
  "powdered-sugar": { name: "Powdered sugar", gPerCup: 120, note: "Unsifted powdered sugar, about 120 g per cup." },
  cocoa: { name: "Cocoa powder", gPerCup: 85, note: "Unsweetened cocoa powder, about 85 g per cup." },
  "rolled-oats": { name: "Rolled oats", gPerCup: 90, note: "Old-fashioned rolled oats, about 90 g per cup." },
  rice: { name: "Rice (uncooked)", gPerCup: 185, note: "Uncooked white rice, about 185 g per cup." },
  cornstarch: { name: "Cornstarch", gPerCup: 128, note: "Cornstarch / cornflour, about 128 g per cup." },
  salt: { name: "Salt (table)", gPerCup: 292, note: "Fine table salt, about 292 g per cup — measure carefully." },
  "baking-soda": { name: "Baking soda", gPerCup: 220, note: "Baking soda, about 220 g per cup." },
  "baking-powder": { name: "Baking powder", gPerCup: 192, note: "Baking powder, about 192 g per cup." },
  "chocolate-chips": { name: "Chocolate chips", gPerCup: 170, note: "Standard chocolate chips, about 170 g per cup." },
  "chopped-nuts": { name: "Chopped nuts", gPerCup: 120, note: "Chopped nuts, about 120 g per cup." },
  "sour-cream": { name: "Sour cream", gPerCup: 242, note: "Full-fat sour cream, about 242 g per cup." },
  "greek-yogurt": { name: "Greek yogurt", gPerCup: 245, note: "Thick Greek yogurt, about 245 g per cup." },
  "cream-cheese": { name: "Cream cheese", gPerCup: 232, note: "Block cream cheese, about 232 g per cup." },
  "peanut-butter": { name: "Peanut butter", gPerCup: 258, note: "Creamy peanut butter, about 258 g per cup." },
  "mashed-banana": { name: "Mashed banana", gPerCup: 225, note: "Mashed ripe banana, about 225 g per cup." },
  "shredded-cheese": { name: "Shredded cheese", gPerCup: 113, note: "Loosely packed shredded cheese, about 113 g per cup." },
  custom: { name: "Custom…", gPerCup: null, note: "Enter your own grams-per-cup value." },
};

export const US_CUP_ML = 236.588;
export const METRIC_CUP_ML = 250;
export const TBSP_ML = 14.787;
export const TSP_ML = 4.929;
export const OZ_G = 28.3495;
export const FLOZ_ML = 29.5735;
export const LB_G = 453.592;
export const PINT_ML = US_CUP_ML * 2;
export const QUART_ML = US_CUP_ML * 4;
export const GALLON_ML = US_CUP_ML * 16;

export type CupStandard = "us" | "metric";
export type ConverterMode = "ingredient" | "weight" | "volume" | "temp";

const FRACTIONS = [
  { v: 0, label: "" },
  { v: 1 / 8, label: "⅛" },
  { v: 1 / 4, label: "¼" },
  { v: 1 / 3, label: "⅓" },
  { v: 1 / 2, label: "½" },
  { v: 2 / 3, label: "⅔" },
  { v: 3 / 4, label: "¾" },
];

export function cupMl(standard: CupStandard): number {
  return standard === "metric" ? METRIC_CUP_ML : US_CUP_ML;
}

export function gPerSelectedCup(gPerUsCup: number, standard: CupStandard): number {
  return gPerUsCup * (cupMl(standard) / US_CUP_ML);
}

export function nearestFraction(x: number): { v: number; label: string } {
  let best = FRACTIONS[0];
  let bestDiff = Infinity;
  for (const f of FRACTIONS) {
    const d = Math.abs(x - f.v);
    if (d < bestDiff) {
      best = f;
      bestDiff = d;
    }
  }
  if (Math.abs(x - 1) < bestDiff && x > 0.9) return { v: 1, label: "" };
  return best;
}

export function formatMixedNumber(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.floor(abs + 1e-9);
  const fracPart = abs - whole;
  const frac = nearestFraction(fracPart);
  let w = whole;
  let label = frac.label;
  if (frac.v === 1 || (fracPart > 0.9 && !label)) {
    w += 1;
    label = "";
  } else if (Math.abs(fracPart - frac.v) > 0.07 && fracPart > 0.02) {
    return sign + abs.toFixed(1).replace(/\.0$/, "");
  }
  if (w === 0 && label) return sign + label;
  if (w === 0) return sign + "0";
  if (!label) return sign + String(w);
  return sign + w + " " + label;
}

export function roundGrams(g: number): number {
  return Math.round(g);
}

export function roundOz(oz: number): number {
  return Math.round(oz * 10) / 10;
}

export function formatNumber(n: number, digits: number): string {
  if (!Number.isFinite(n)) return "—";
  const s = n.toFixed(digits);
  return s.replace(/\.?0+$/, "") || "0";
}

export function volUnits(standard: CupStandard): Record<string, { label: string; toMl: number }> {
  const cup = cupMl(standard);
  return {
    ml: { label: "milliliters (mL)", toMl: 1 },
    l: { label: "liters (L)", toMl: 1000 },
    tsp: { label: "teaspoons (tsp)", toMl: TSP_ML },
    tbsp: { label: "tablespoons (tbsp)", toMl: TBSP_ML },
    floz: { label: "fluid ounces (fl oz)", toMl: FLOZ_ML },
    cup: { label: standard === "metric" ? "cups (metric 250 mL)" : "cups (US)", toMl: cup },
    pint: { label: "pints (US)", toMl: PINT_ML },
    quart: { label: "quarts (US)", toMl: QUART_ML },
    gallon: { label: "gallons (US)", toMl: GALLON_ML },
  };
}

export function weightUnits(): Record<string, { label: string; toG: number }> {
  return {
    g: { label: "grams (g)", toG: 1 },
    kg: { label: "kilograms (kg)", toG: 1000 },
    oz: { label: "ounces (oz weight)", toG: OZ_G },
    lb: { label: "pounds (lb)", toG: LB_G },
  };
}

export function ingredientUnits(standard: CupStandard, includeStick: boolean): Record<string, { label: string; type: string }> {
  const units: Record<string, { label: string; type: string }> = {
    g: { label: "grams (g)", type: "weight" },
    kg: { label: "kilograms (kg)", type: "weight" },
    oz: { label: "ounces (oz weight)", type: "weight" },
    lb: { label: "pounds (lb)", type: "weight" },
    ml: { label: "milliliters (mL)", type: "volume" },
    floz: { label: "fluid ounces (fl oz)", type: "volume" },
    tsp: { label: "teaspoons (tsp)", type: "volume" },
    tbsp: { label: "tablespoons (tbsp)", type: "volume" },
    cup: { label: standard === "metric" ? "cups (metric)" : "cups (US)", type: "volume" },
  };
  if (includeStick) units.stick = { label: "sticks (butter)", type: "special" };
  return units;
}

export function ingredientToGrams(amount: number, unit: string, densityGPerCup: number, standard: CupStandard): number {
  if (!Number.isFinite(amount) || amount < 0) return NaN;
  const cup = cupMl(standard);
  const gPerMl = densityGPerCup / cup;
  switch (unit) {
    case "g": return amount;
    case "kg": return amount * 1000;
    case "oz": return amount * OZ_G;
    case "lb": return amount * LB_G;
    case "ml": return amount * gPerMl;
    case "floz": return amount * FLOZ_ML * gPerMl;
    case "tsp": return amount * TSP_ML * gPerMl;
    case "tbsp": return amount * TBSP_ML * gPerMl;
    case "cup": return amount * densityGPerCup;
    case "stick": return amount * (INGREDIENTS.butter.stickG || 113);
    default: return NaN;
  }
}

export function gramsToIngredientUnit(grams: number, unit: string, densityGPerCup: number, standard: CupStandard): number {
  if (!Number.isFinite(grams)) return NaN;
  const cup = cupMl(standard);
  const gPerMl = densityGPerCup / cup;
  switch (unit) {
    case "g": return grams;
    case "kg": return grams / 1000;
    case "oz": return grams / OZ_G;
    case "lb": return grams / LB_G;
    case "ml": return grams / gPerMl;
    case "floz": return grams / (FLOZ_ML * gPerMl);
    case "tsp": return grams / (TSP_ML * gPerMl);
    case "tbsp": return grams / (TBSP_ML * gPerMl);
    case "cup": return grams / densityGPerCup;
    case "stick": return grams / (INGREDIENTS.butter.stickG || 113);
    default: return NaN;
  }
}

export function friendlyFromMl(ml: number, standard: CupStandard): string {
  if (!Number.isFinite(ml) || ml === 0) return "0";
  const abs = Math.abs(ml);
  const sign = ml < 0 ? "-" : "";
  const cup = cupMl(standard);

  if (abs < TSP_ML * 0.4) return sign + formatNumber(abs, 1) + " mL";
  if (abs < TBSP_ML * 0.75) return sign + formatMixedNumber(abs / TSP_ML) + " tsp";
  if (abs < cup * 0.2) {
    const tbsp = abs / TBSP_ML;
    const whole = Math.floor(tbsp);
    const remTsp = (abs - whole * TBSP_ML) / TSP_ML;
    let out = sign;
    if (whole > 0) out += whole + " tbsp";
    if (remTsp >= 0.4) {
      if (whole > 0) out += " + ";
      out += formatMixedNumber(remTsp) + " tsp";
    }
    if (out === sign) out += formatMixedNumber(tbsp) + " tbsp";
    return out;
  }

  const cups = abs / cup;
  const wholeCups = Math.floor(cups + 1e-9);
  let rem = abs - wholeCups * cup;
  const fracCup = rem / cup;
  const snapped = nearestFraction(fracCup);
  let parts = sign;
  let usedCups = wholeCups;
  if (Math.abs(fracCup - snapped.v) <= 0.07) {
    rem = abs - (wholeCups + snapped.v) * cup;
    if (snapped.v === 1) {
      usedCups += 1;
      parts += usedCups + (usedCups === 1 ? " cup" : " cups");
    } else if (usedCups > 0 && snapped.label) {
      parts += usedCups + " " + snapped.label + " cups";
      rem = Math.max(0, rem);
    } else if (usedCups === 0 && snapped.label) {
      parts += snapped.label + " cup";
      rem = Math.max(0, rem);
    } else if (usedCups > 0) {
      parts += usedCups + (usedCups === 1 ? " cup" : " cups");
    }
  } else if (usedCups > 0) {
    parts += usedCups + (usedCups === 1 ? " cup" : " cups");
  }

  if (rem >= TBSP_ML * 0.45) {
    const tbsp = Math.round(rem / TBSP_ML);
    if (tbsp > 0) {
      if (parts !== sign) parts += " + ";
      parts += tbsp + " tbsp";
      rem -= tbsp * TBSP_ML;
    }
  }
  if (rem >= TSP_ML * 0.45) {
    const tsp = Math.round(rem / TSP_ML);
    if (tsp > 0) {
      if (parts !== sign) parts += " + ";
      parts += tsp + " tsp";
    }
  }
  if (parts === sign) {
    return sign + formatMixedNumber(cups) + (Math.abs(cups - 1) < 0.05 ? " cup" : " cups");
  }
  return parts;
}

export function friendlyWeight(grams: number): string {
  if (!Number.isFinite(grams)) return "—";
  const abs = Math.abs(grams);
  const sign = grams < 0 ? "-" : "";
  if (abs >= LB_G) {
    const lb = abs / LB_G;
    const whole = Math.floor(lb);
    const remOz = (abs - whole * LB_G) / OZ_G;
    let out = sign;
    if (whole > 0) out += whole + " lb";
    if (remOz >= 0.15) {
      if (whole > 0) out += " ";
      out += roundOz(remOz) + " oz";
    }
    return out || sign + roundOz(abs / OZ_G) + " oz";
  }
  if (abs >= OZ_G * 0.5) return sign + roundOz(abs / OZ_G) + " oz";
  return sign + roundGrams(abs) + " g";
}

export function unitLabelShort(unit: string): string {
  const map: Record<string, string> = {
    g: "g", kg: "kg", oz: "oz", lb: "lb",
    ml: "mL", l: "L", tsp: "tsp", tbsp: "tbsp",
    floz: "fl oz", cup: "cups", pint: "pt", quart: "qt", gallon: "gal",
    stick: "sticks", c: "°C", f: "°F",
  };
  return map[unit] || unit;
}

export function cToGasMark(c: number): string {
  const table: [number, string][] = [
    [135, "1"], [150, "2"], [160, "3"], [180, "4"],
    [190, "5"], [200, "6"], [220, "7"], [230, "8"], [240, "9"],
  ];
  let best = table[0];
  let bestDiff = Infinity;
  for (const row of table) {
    const d = Math.abs(row[0] - c);
    if (d < bestDiff) {
      best = row;
      bestDiff = d;
    }
  }
  if (c < 130) return "below Gas Mark 1";
  if (c > 250) return "above Gas Mark 9";
  return "about Gas Mark " + best[1];
}

export function ingredientEntries(): { key: string; name: string }[] {
  return Object.keys(INGREDIENTS).map((key) => ({ key, name: INGREDIENTS[key].name }));
}
