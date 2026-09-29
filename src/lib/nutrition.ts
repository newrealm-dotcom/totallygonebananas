import { parseIngredient } from "parse-ingredient";
import { parseServingCount } from "@/lib/format";
import { flattenIngredientItems, type IngredientGroup } from "@/lib/ingredients";

/** Per-serving / total macros for a recipe estimate. */
export interface NutritionFacts {
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  sodium: number;
}

export interface RecipeNutrition {
  perServing: NutritionFacts;
  total: NutritionFacts;
  servings: number;
  unmatched: string[];
  matchedCount: number;
  calculatedAt: string;
}

interface FoodEntry {
  /** Match tokens against the ingredient description (lowercase). */
  keys: string[];
  /** Nutrients per 100 g. */
  per100g: NutritionFacts;
  /** Grams for common household units when density matters. */
  unitGrams?: Partial<Record<string, number>>;
  /** Default grams when the line is counted as “each” / no unit. */
  eachGrams?: number;
}

const emptyFacts = (): NutritionFacts => ({
  calories: 0,
  fat: 0,
  saturatedFat: 0,
  carbs: 0,
  fiber: 0,
  sugar: 0,
  protein: 0,
  sodium: 0,
});

function scaleFacts(facts: NutritionFacts, grams: number): NutritionFacts {
  const k = grams / 100;
  return {
    calories: facts.calories * k,
    fat: facts.fat * k,
    saturatedFat: facts.saturatedFat * k,
    carbs: facts.carbs * k,
    fiber: facts.fiber * k,
    sugar: facts.sugar * k,
    protein: facts.protein * k,
    sodium: facts.sodium * k,
  };
}

function addFacts(a: NutritionFacts, b: NutritionFacts): NutritionFacts {
  return {
    calories: a.calories + b.calories,
    fat: a.fat + b.fat,
    saturatedFat: a.saturatedFat + b.saturatedFat,
    carbs: a.carbs + b.carbs,
    fiber: a.fiber + b.fiber,
    sugar: a.sugar + b.sugar,
    protein: a.protein + b.protein,
    sodium: a.sodium + b.sodium,
  };
}

function roundFacts(facts: NutritionFacts): NutritionFacts {
  return {
    calories: Math.round(facts.calories),
    fat: Math.round(facts.fat * 10) / 10,
    saturatedFat: Math.round(facts.saturatedFat * 10) / 10,
    carbs: Math.round(facts.carbs * 10) / 10,
    fiber: Math.round(facts.fiber * 10) / 10,
    sugar: Math.round(facts.sugar * 10) / 10,
    protein: Math.round(facts.protein * 10) / 10,
    sodium: Math.round(facts.sodium),
  };
}

/** Common baking/cooking foods (USDA-ish per 100 g). Prefer longer/more specific keys first via sort. */
const FOODS: FoodEntry[] = [
  { keys: ["all-purpose flour", "all purpose flour", "ap flour", "flour"], per100g: { calories: 364, fat: 1, saturatedFat: 0.2, carbs: 76.3, fiber: 2.7, sugar: 0.3, protein: 10.3, sodium: 2 }, unitGrams: { cup: 125, tablespoon: 8, teaspoon: 2.6 } },
  { keys: ["whole wheat flour", "whole-wheat flour"], per100g: { calories: 340, fat: 1.9, saturatedFat: 0.3, carbs: 72, fiber: 10.7, sugar: 0.4, protein: 13.2, sodium: 2 }, unitGrams: { cup: 120 } },
  { keys: ["mashed banana", "ripe banana", "banana", "bananas"], per100g: { calories: 89, fat: 0.3, saturatedFat: 0.1, carbs: 22.8, fiber: 2.6, sugar: 12.2, protein: 1.1, sodium: 1 }, unitGrams: { cup: 225 }, eachGrams: 118 },
  { keys: ["blueberry", "blueberries"], per100g: { calories: 57, fat: 0.3, saturatedFat: 0, carbs: 14.5, fiber: 2.4, sugar: 10, protein: 0.7, sodium: 1 }, unitGrams: { cup: 148 }, eachGrams: 2 },
  { keys: ["strawberry", "strawberries"], per100g: { calories: 32, fat: 0.3, saturatedFat: 0, carbs: 7.7, fiber: 2, sugar: 4.9, protein: 0.7, sodium: 1 }, unitGrams: { cup: 152 } },
  { keys: ["granulated sugar", "white sugar", "sugar"], per100g: { calories: 387, fat: 0, saturatedFat: 0, carbs: 100, fiber: 0, sugar: 100, protein: 0, sodium: 0 }, unitGrams: { cup: 200, tablespoon: 12.5, teaspoon: 4.2 } },
  { keys: ["brown sugar"], per100g: { calories: 380, fat: 0, saturatedFat: 0, carbs: 98.1, fiber: 0, sugar: 97, protein: 0.1, sodium: 28 }, unitGrams: { cup: 220, tablespoon: 13.8 } },
  { keys: ["powdered sugar", "confectioners sugar", "icing sugar"], per100g: { calories: 389, fat: 0, saturatedFat: 0, carbs: 99.8, fiber: 0, sugar: 97.8, protein: 0, sodium: 2 }, unitGrams: { cup: 120, tablespoon: 7.5 } },
  { keys: ["unsalted butter", "salted butter", "butter"], per100g: { calories: 717, fat: 81.1, saturatedFat: 51.4, carbs: 0.1, fiber: 0, sugar: 0.1, protein: 0.9, sodium: 11 }, unitGrams: { cup: 227, tablespoon: 14, teaspoon: 4.7 } },
  { keys: ["cream cheese"], per100g: { calories: 342, fat: 34.2, saturatedFat: 19.3, carbs: 4.1, fiber: 0, sugar: 3.2, protein: 5.9, sodium: 321 }, unitGrams: { cup: 232, tablespoon: 14.5 }, eachGrams: 28 },
  { keys: ["avocado oil", "olive oil", "vegetable oil", "canola oil", "oil"], per100g: { calories: 884, fat: 100, saturatedFat: 14, carbs: 0, fiber: 0, sugar: 0, protein: 0, sodium: 0 }, unitGrams: { cup: 218, tablespoon: 13.6, teaspoon: 4.5 } },
  { keys: ["large egg", "eggs", "egg"], per100g: { calories: 143, fat: 9.5, saturatedFat: 3.1, carbs: 0.7, fiber: 0, sugar: 0.4, protein: 12.6, sodium: 142 }, eachGrams: 50 },
  { keys: ["egg white", "egg whites"], per100g: { calories: 52, fat: 0.2, saturatedFat: 0, carbs: 0.7, fiber: 0, sugar: 0.7, protein: 10.9, sodium: 166 }, eachGrams: 33, unitGrams: { cup: 243 } },
  { keys: ["egg yolk", "egg yolks"], per100g: { calories: 322, fat: 26.5, saturatedFat: 9.6, carbs: 3.6, fiber: 0, sugar: 0.6, protein: 15.9, sodium: 48 }, eachGrams: 17 },
  { keys: ["vanilla paste", "vanilla extract", "vanilla"], per100g: { calories: 288, fat: 0.1, saturatedFat: 0, carbs: 12.7, fiber: 0, sugar: 12.7, protein: 0.1, sodium: 9 }, unitGrams: { tablespoon: 13, teaspoon: 4.2 } },
  { keys: ["baking powder"], per100g: { calories: 53, fat: 0, saturatedFat: 0, carbs: 27.7, fiber: 0.2, sugar: 0, protein: 0, sodium: 10600 }, unitGrams: { tablespoon: 14, teaspoon: 4.6 } },
  { keys: ["baking soda", "bicarbonate of soda"], per100g: { calories: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0, sodium: 27360 }, unitGrams: { tablespoon: 14, teaspoon: 4.6 } },
  { keys: ["kosher salt", "sea salt", "table salt", "salt"], per100g: { calories: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0, sodium: 38758 }, unitGrams: { tablespoon: 18, teaspoon: 6 }, eachGrams: 0.4 },
  { keys: ["cornstarch", "corn starch"], per100g: { calories: 381, fat: 0.1, saturatedFat: 0, carbs: 91.3, fiber: 0.9, sugar: 0, protein: 0.3, sodium: 9 }, unitGrams: { tablespoon: 8, teaspoon: 2.7, cup: 128 } },
  { keys: ["milk", "whole milk"], per100g: { calories: 61, fat: 3.3, saturatedFat: 1.9, carbs: 4.8, fiber: 0, sugar: 5.1, protein: 3.2, sodium: 43 }, unitGrams: { cup: 244, tablespoon: 15 } },
  { keys: ["almond milk"], per100g: { calories: 15, fat: 1.1, saturatedFat: 0.1, carbs: 0.6, fiber: 0.2, sugar: 0, protein: 0.4, sodium: 63 }, unitGrams: { cup: 240 } },
  { keys: ["oat milk"], per100g: { calories: 43, fat: 1.5, saturatedFat: 0.1, carbs: 6.7, fiber: 0.8, sugar: 2.9, protein: 1.3, sodium: 42 }, unitGrams: { cup: 240 } },
  { keys: ["heavy cream", "whipping cream", "heavy whipping cream"], per100g: { calories: 340, fat: 36, saturatedFat: 23, carbs: 2.8, fiber: 0, sugar: 2.9, protein: 2, sodium: 38 }, unitGrams: { cup: 238, tablespoon: 15 } },
  { keys: ["sour cream"], per100g: { calories: 198, fat: 19.4, saturatedFat: 10.1, carbs: 4.6, fiber: 0, sugar: 3.4, protein: 2.4, sodium: 80 }, unitGrams: { cup: 230, tablespoon: 12 } },
  { keys: ["greek yogurt", "yogurt"], per100g: { calories: 97, fat: 5, saturatedFat: 2.5, carbs: 3.6, fiber: 0, sugar: 3.2, protein: 9, sodium: 46 }, unitGrams: { cup: 245, tablespoon: 15 } },
  { keys: ["protein powder", "whey protein", "casein"], per100g: { calories: 400, fat: 5, saturatedFat: 2, carbs: 10, fiber: 0, sugar: 4, protein: 80, sodium: 300 }, unitGrams: { scoop: 30, tablespoon: 10 }, eachGrams: 30 },
  { keys: ["rolled oats", "oats", "oatmeal"], per100g: { calories: 389, fat: 6.9, saturatedFat: 1.2, carbs: 66.3, fiber: 10.6, sugar: 0.99, protein: 16.9, sodium: 2 }, unitGrams: { cup: 90 } },
  { keys: ["honey"], per100g: { calories: 304, fat: 0, saturatedFat: 0, carbs: 82.4, fiber: 0.2, sugar: 82.1, protein: 0.3, sodium: 4 }, unitGrams: { tablespoon: 21, teaspoon: 7, cup: 340 } },
  { keys: ["maple syrup"], per100g: { calories: 260, fat: 0.1, saturatedFat: 0, carbs: 67, fiber: 0, sugar: 60.5, protein: 0, sodium: 12 }, unitGrams: { tablespoon: 20, teaspoon: 6.7, cup: 315 } },
  { keys: ["peanut butter"], per100g: { calories: 588, fat: 50, saturatedFat: 10, carbs: 20, fiber: 6, sugar: 9, protein: 25, sodium: 426 }, unitGrams: { tablespoon: 16, cup: 258 } },
  { keys: ["cocoa powder", "unsweetened cocoa"], per100g: { calories: 228, fat: 13.7, saturatedFat: 8, carbs: 57.9, fiber: 37, sugar: 1.8, protein: 19.6, sodium: 21 }, unitGrams: { tablespoon: 5.4, cup: 86 } },
  { keys: ["chocolate chip", "chocolate chips", "semi-sweet chocolate"], per100g: { calories: 479, fat: 30, saturatedFat: 18, carbs: 63, fiber: 5, sugar: 54, protein: 4.2, sodium: 20 }, unitGrams: { cup: 170, tablespoon: 10.6 } },
  { keys: ["walnuts"], per100g: { calories: 654, fat: 65.2, saturatedFat: 6.1, carbs: 13.7, fiber: 6.7, sugar: 2.6, protein: 15.2, sodium: 2 }, unitGrams: { cup: 117 } },
  { keys: ["pecans"], per100g: { calories: 691, fat: 72, saturatedFat: 6.2, carbs: 13.9, fiber: 9.6, sugar: 4, protein: 9.2, sodium: 0 }, unitGrams: { cup: 109 } },
  { keys: ["almonds"], per100g: { calories: 579, fat: 49.9, saturatedFat: 3.8, carbs: 21.6, fiber: 12.5, sugar: 4.4, protein: 21.2, sodium: 1 }, unitGrams: { cup: 143 } },
  { keys: ["cinnamon"], per100g: { calories: 247, fat: 1.2, saturatedFat: 0.3, carbs: 80.6, fiber: 53.1, sugar: 2.2, protein: 4, sodium: 10 }, unitGrams: { tablespoon: 7.8, teaspoon: 2.6 } },
  { keys: ["nutmeg"], per100g: { calories: 525, fat: 36.3, saturatedFat: 25.9, carbs: 49.3, fiber: 20.8, sugar: 28.5, protein: 5.8, sodium: 16 }, unitGrams: { teaspoon: 2.2 } },
  { keys: ["lemon juice"], per100g: { calories: 22, fat: 0.2, saturatedFat: 0, carbs: 6.9, fiber: 0.3, sugar: 2.5, protein: 0.4, sodium: 1 }, unitGrams: { tablespoon: 15, cup: 244, teaspoon: 5 } },
  { keys: ["lemon zest", "zest of lemon"], per100g: { calories: 47, fat: 0.3, saturatedFat: 0.1, carbs: 16, fiber: 10.6, sugar: 4.2, protein: 1.5, sodium: 6 }, unitGrams: { tablespoon: 6, teaspoon: 2 } },
  { keys: ["graham cracker", "graham crackers"], per100g: { calories: 423, fat: 10, saturatedFat: 1.5, carbs: 76, fiber: 3.4, sugar: 25, protein: 6.5, sodium: 480 }, unitGrams: { cup: 84 }, eachGrams: 14 },
  { keys: ["instant pudding", "pudding mix"], per100g: { calories: 377, fat: 0.5, saturatedFat: 0.2, carbs: 93, fiber: 0, sugar: 80, protein: 0.2, sodium: 1400 }, unitGrams: { package: 96, box: 96 }, eachGrams: 96 },
  { keys: ["cool whip", "whipped topping"], per100g: { calories: 318, fat: 25.3, saturatedFat: 21.5, carbs: 23.3, fiber: 0, sugar: 17.5, protein: 1.1, sodium: 57 }, unitGrams: { cup: 75, tablespoon: 9 } },
  { keys: ["cottage cheese"], per100g: { calories: 98, fat: 4.3, saturatedFat: 1.7, carbs: 3.4, fiber: 0, sugar: 2.7, protein: 11.1, sodium: 364 }, unitGrams: { cup: 226 } },
  { keys: ["cream of coconut", "coconut cream"], per100g: { calories: 330, fat: 34.7, saturatedFat: 30.8, carbs: 6.7, fiber: 2.2, sugar: 3.3, protein: 3.6, sodium: 4 }, unitGrams: { cup: 240, tablespoon: 15 } },
  { keys: ["shredded coconut", "coconut"], per100g: { calories: 660, fat: 64.5, saturatedFat: 57.2, carbs: 23.7, fiber: 16.3, sugar: 7.4, protein: 6.9, sodium: 37 }, unitGrams: { cup: 80 } },
  { keys: ["water"], per100g: { calories: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0, sodium: 0 }, unitGrams: { cup: 240, tablespoon: 15 } },
];

const FOODS_SORTED = [...FOODS].sort((a, b) => Math.max(...b.keys.map((k) => k.length)) - Math.max(...a.keys.map((k) => k.length)));

const UNIT_ALIASES: Record<string, string> = {
  cup: "cup",
  cups: "cup",
  c: "cup",
  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  tbsp: "tablespoon",
  tbs: "tablespoon",
  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
  tsp: "teaspoon",
  ounce: "ounce",
  ounces: "ounce",
  oz: "ounce",
  pound: "pound",
  pounds: "pound",
  lb: "pound",
  lbs: "pound",
  gram: "gram",
  grams: "gram",
  g: "gram",
  kilogram: "kilogram",
  kilograms: "kilogram",
  kg: "kilogram",
  milliliter: "milliliter",
  milliliters: "milliliter",
  ml: "milliliter",
  pinch: "pinch",
  pinches: "pinch",
  scoop: "scoop",
  scoops: "scoop",
  package: "package",
  packages: "package",
  box: "box",
  large: "each",
  medium: "each",
  small: "each",
};

function findFood(description: string): FoodEntry | null {
  const d = description.toLowerCase();
  for (const food of FOODS_SORTED) {
    if (food.keys.some((k) => d.includes(k))) return food;
  }
  return null;
}

function gramsForLine(opts: {
  quantity: number | null;
  unitId: string | null;
  description: string;
  food: FoodEntry;
}): number | null {
  const qty = opts.quantity && opts.quantity > 0 ? opts.quantity : 1;
  const unitRaw = (opts.unitId || "").toLowerCase();
  const unit = UNIT_ALIASES[unitRaw] || unitRaw;

  if (unit === "gram") return qty;
  if (unit === "kilogram") return qty * 1000;
  if (unit === "ounce") return qty * 28.35;
  if (unit === "pound") return qty * 453.6;
  if (unit === "milliliter") return qty; // approx water density; oils override via unitGrams when matched as cup/tbsp
  if (unit === "pinch") return qty * (foodPinchGrams(opts.food) ?? 0.3);

  if (unit && opts.food.unitGrams?.[unit] != null) {
    return qty * (opts.food.unitGrams[unit] as number);
  }

  // Counted items: "3 bananas", "2 large eggs"
  if (!unit || unit === "each") {
    if (opts.food.eachGrams != null) return qty * opts.food.eachGrams;
  }

  return null;
}

function foodPinchGrams(food: FoodEntry): number | null {
  if (food.keys.some((k) => k.includes("salt"))) return 0.4;
  return food.unitGrams?.teaspoon ? food.unitGrams.teaspoon / 8 : null;
}

/** Estimate nutrition from ingredient groups. Returns null when nothing can be matched. */
export function estimateRecipeNutrition(
  ingredients: IngredientGroup[] | string[],
  servings: string | number | null | undefined,
): RecipeNutrition | null {
  const lines = Array.isArray(ingredients) && typeof ingredients[0] === "string"
    ? (ingredients as string[])
    : flattenIngredientItems(ingredients as IngredientGroup[]);

  let total = emptyFacts();
  const unmatched: string[] = [];
  let matchedCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseIngredient(trimmed)[0];
    if (!parsed || parsed.isGroupHeader) {
      unmatched.push(trimmed);
      continue;
    }
    const food = findFood(parsed.description);
    if (!food) {
      unmatched.push(trimmed);
      continue;
    }
    const grams = gramsForLine({
      quantity: parsed.quantity,
      unitId: parsed.unitOfMeasureID,
      description: parsed.description,
      food,
    });
    if (grams == null || grams <= 0) {
      unmatched.push(trimmed);
      continue;
    }
    total = addFacts(total, scaleFacts(food.per100g, grams));
    matchedCount += 1;
  }

  if (matchedCount === 0) return null;

  const serv = parseServingCount(servings) ?? 1;
  const perServing = roundFacts({
    calories: total.calories / serv,
    fat: total.fat / serv,
    saturatedFat: total.saturatedFat / serv,
    carbs: total.carbs / serv,
    fiber: total.fiber / serv,
    sugar: total.sugar / serv,
    protein: total.protein / serv,
    sodium: total.sodium / serv,
  });

  return {
    perServing,
    total: roundFacts(total),
    servings: serv,
    unmatched,
    matchedCount,
    calculatedAt: new Date().toISOString(),
  };
}

export function normalizeNutrition(raw: unknown): RecipeNutrition | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<RecipeNutrition>;
  if (!o.perServing || typeof o.perServing !== "object") return null;
  const p = o.perServing as NutritionFacts;
  if (typeof p.calories !== "number") return null;
  return {
    perServing: roundFacts({
      calories: p.calories || 0,
      fat: p.fat || 0,
      saturatedFat: p.saturatedFat || 0,
      carbs: p.carbs || 0,
      fiber: p.fiber || 0,
      sugar: p.sugar || 0,
      protein: p.protein || 0,
      sodium: p.sodium || 0,
    }),
    total: o.total && typeof o.total === "object" ? roundFacts(o.total as NutritionFacts) : roundFacts(p),
    servings: typeof o.servings === "number" && o.servings > 0 ? o.servings : 1,
    unmatched: Array.isArray(o.unmatched) ? o.unmatched.map(String) : [],
    matchedCount: typeof o.matchedCount === "number" ? o.matchedCount : 0,
    calculatedAt: typeof o.calculatedAt === "string" ? o.calculatedAt : "",
  };
}
