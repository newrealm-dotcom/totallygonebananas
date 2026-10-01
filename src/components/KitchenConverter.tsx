"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  INGREDIENTS,
  OZ_G,
  FLOZ_ML,
  TBSP_ML,
  TSP_ML,
  type ConverterMode,
  type CupStandard,
  cToGasMark,
  cupMl,
  formatMixedNumber,
  formatNumber,
  friendlyFromMl,
  friendlyWeight,
  gPerSelectedCup,
  gramsToIngredientUnit,
  ingredientEntries,
  ingredientToGrams,
  ingredientUnits,
  roundGrams,
  roundOz,
  unitLabelShort,
  volUnits,
  weightUnits,
} from "@/lib/kitchen-converter";

interface ResultView {
  precise: string;
  friendly: string;
  note: string;
  footnote?: string;
}

type ViewMode = "collapsed" | "inline" | "modal";

const EMPTY: ResultView = { precise: "—", friendly: "", note: "" };

export function KitchenConverter() {
  const [view, setView] = useState<ViewMode>("collapsed");
  const [mode, setMode] = useState<ConverterMode>("ingredient");
  const [cupStandard, setCupStandard] = useState<CupStandard>("us");
  const [ingredientKey, setIngredientKey] = useState("ap-flour");
  const [ingSearch, setIngSearch] = useState(INGREDIENTS["ap-flour"].name);
  const [listOpen, setListOpen] = useState(false);
  const [customDensity, setCustomDensity] = useState("");
  const [ingAmount, setIngAmount] = useState("1");
  const [ingUnit, setIngUnit] = useState("cup");
  const [ingTo, setIngTo] = useState("g");
  const [wtAmount, setWtAmount] = useState("100");
  const [wtUnit, setWtUnit] = useState("g");
  const [wtTo, setWtTo] = useState("oz");
  const [volAmount, setVolAmount] = useState("1");
  const [volUnit, setVolUnit] = useState("cup");
  const [volTo, setVolTo] = useState("ml");
  const [tempAmount, setTempAmount] = useState("180");
  const [tempUnit, setTempUnit] = useState("c");
  const [tempTo, setTempTo] = useState("f");
  const [copied, setCopied] = useState<ConverterMode | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const expanded = view !== "collapsed";
  const isModal = view === "modal";

  const density = useMemo(() => {
    const ing = INGREDIENTS[ingredientKey];
    if (!ing) return null;
    if (ingredientKey === "custom") {
      const custom = Number(customDensity);
      return Number.isFinite(custom) && custom > 0 ? custom : null;
    }
    return gPerSelectedCup(ing.gPerCup!, cupStandard);
  }, [ingredientKey, customDensity, cupStandard]);

  const ingUnitOptions = useMemo(
    () => ingredientUnits(cupStandard, ingredientKey === "butter"),
    [cupStandard, ingredientKey],
  );
  const volUnitOptions = useMemo(() => volUnits(cupStandard), [cupStandard]);
  const wtUnitOptions = useMemo(() => weightUnits(), []);
  const activeIngUnit = ingUnit in ingUnitOptions ? ingUnit : "cup";
  const activeIngTo = ingTo in ingUnitOptions ? ingTo : "g";
  const activeVolUnit = volUnit in volUnitOptions ? volUnit : "cup";
  const activeVolTo = volTo in volUnitOptions ? volTo : "ml";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setListOpen(false);
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest?.(".kcc-combo-list")
      ) {
        setListOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (!isModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setView("inline");
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isModal]);

  const filteredIngredients = useMemo(() => {
    const q = ingSearch.trim().toLowerCase();
    return ingredientEntries().filter(
      (e) => !q || e.name.toLowerCase().includes(q) || e.key.includes(q),
    );
  }, [ingSearch]);

  function pickIngredient(key: string) {
    if (!INGREDIENTS[key]) return;
    setIngredientKey(key);
    setIngSearch(INGREDIENTS[key].name);
    setListOpen(false);
    if (key !== "butter" && (ingUnit === "stick" || ingTo === "stick")) {
      if (ingUnit === "stick") setIngUnit("cup");
      if (ingTo === "stick") setIngTo("g");
    }
  }

  const ingResult: ResultView = useMemo(() => {
    const ing = INGREDIENTS[ingredientKey];
    if (!density) {
      return { precise: "Enter a density", friendly: "", note: "Custom mode needs grams per cup." };
    }
    const amount = Number(ingAmount);
    if (!Number.isFinite(amount) || amount < 0) return EMPTY;

    const grams = ingredientToGrams(amount, activeIngUnit, density, cupStandard);
    let result = gramsToIngredientUnit(grams, activeIngTo, density, cupStandard);
    let digits = activeIngTo === "g" ? 0 : activeIngTo === "oz" || activeIngTo === "floz" ? 1 : 2;
    if (activeIngTo === "g") result = roundGrams(result);
    if (activeIngTo === "oz") result = roundOz(result);

    let displayUnit = activeIngTo;
    let displayVal = result;
    if (activeIngTo === "cup" && Math.abs(result) > 0 && Math.abs(result) < 0.125) {
      displayUnit = Math.abs(result) * cupMl(cupStandard) < TBSP_ML ? "tsp" : "tbsp";
      displayVal = gramsToIngredientUnit(grams, displayUnit, density, cupStandard);
      digits = 2;
    }

    const precise =
      (digits === 0 ? String(Math.round(displayVal)) : formatNumber(displayVal, digits)) +
      " " +
      unitLabelShort(displayUnit);

    let friendly = "";
    if (["cup", "tbsp", "tsp", "ml", "floz"].includes(displayUnit)) {
      const ml = grams / (density / cupMl(cupStandard));
      friendly = "≈ " + friendlyFromMl(ml, cupStandard);
      if (displayUnit === "cup" && Math.abs(result - Math.round(result * 8) / 8) > 0.02) {
        friendly = formatNumber(result, 2) + " cups ≈ " + friendlyFromMl(ml, cupStandard);
      } else if (displayUnit === "cup") {
        friendly = "≈ " + formatMixedNumber(result) + (Math.abs(result - 1) < 0.05 ? " cup" : " cups");
      }
    } else if (["g", "kg", "oz", "lb"].includes(displayUnit)) {
      friendly = "≈ " + friendlyWeight(grams);
    } else if (displayUnit === "stick") {
      friendly = "≈ " + formatMixedNumber(displayVal) + (Math.abs(displayVal - 1) < 0.05 ? " stick" : " sticks");
    }

    let note = ing?.note || "";
    if (cupStandard === "metric" && ingredientKey !== "custom") {
      note += " Scaled to a 250 mL metric cup.";
    }
    return { precise, friendly, note };
  }, [density, ingAmount, activeIngUnit, activeIngTo, cupStandard, ingredientKey]);

  const wtResult: ResultView = useMemo(() => {
    const amount = Number(wtAmount);
    if (!Number.isFinite(amount) || amount < 0) return EMPTY;
    const units = weightUnits();
    const g = amount * units[wtUnit].toG;
    let result = g / units[wtTo].toG;
    if (wtTo === "g") result = roundGrams(result);
    if (wtTo === "oz") result = roundOz(result);
    const digits = wtTo === "g" ? 0 : wtTo === "oz" ? 1 : 3;
    return {
      precise: formatNumber(result, digits) + " " + unitLabelShort(wtTo),
      friendly: "≈ " + friendlyWeight(g),
      note: "Ounces here are weight ounces, not fluid ounces.",
    };
  }, [wtAmount, wtUnit, wtTo]);

  const volResult: ResultView = useMemo(() => {
    const amount = Number(volAmount);
    if (!Number.isFinite(amount) || amount < 0) return EMPTY;
    const units = volUnits(cupStandard);
    const ml = amount * units[activeVolUnit].toMl;
    let result = ml / units[activeVolTo].toMl;
    let unit = activeVolTo;
    if (unit === "cup" && result > 0 && result < 0.125) {
      unit = ml < TBSP_ML ? "tsp" : "tbsp";
      result = ml / units[unit].toMl;
    }
    const digits = unit === "ml" ? 0 : 2;
    return {
      precise: formatNumber(result, digits) + " " + unitLabelShort(unit),
      friendly: "≈ " + friendlyFromMl(ml, cupStandard),
      note:
        "Fluid ounces (fl oz) are volume. Cup size: " +
        (cupStandard === "metric" ? "250 mL metric." : "236.588 mL US."),
    };
  }, [volAmount, activeVolUnit, activeVolTo, cupStandard]);

  const tempResult: ResultView = useMemo(() => {
    const amount = Number(tempAmount);
    if (!Number.isFinite(amount)) return EMPTY;
    const c = tempUnit === "c" ? amount : ((amount - 32) * 5) / 9;
    const result = tempTo === "c" ? c : (c * 9) / 5 + 32;
    const toLabel = tempTo === "c" ? "°C" : "°F";
    return {
      precise: formatNumber(result, 0) + " " + toLabel,
      friendly: "",
      note: cToGasMark(c) + ". Conventional ovens vary — use as a guide.",
      footnote: "* Gas Mark is the British oven dial scale (Mark 1 ≈ 135 °C / 275 °F up to Mark 9 ≈ 240 °C / 475 °F).",
    };
  }, [tempAmount, tempUnit, tempTo]);

  const activeResult =
    mode === "ingredient" ? ingResult : mode === "weight" ? wtResult : mode === "volume" ? volResult : tempResult;

  const densityNote =
    ingredientKey === "custom"
      ? "Enter grams per " + (cupStandard === "metric" ? "metric cup (250 mL)" : "US cup") + "."
      : density
        ? "Density: " + formatNumber(density, 1) + " g per cup."
        : "";

  const refRows = useMemo(() => {
    const cupName = cupStandard === "metric" ? "metric cup" : "US cup";
    const flour = gPerSelectedCup(INGREDIENTS["ap-flour"].gPerCup!, cupStandard);
    const sugar = gPerSelectedCup(INGREDIENTS["granulated-sugar"].gPerCup!, cupStandard);
    const butterCup = gPerSelectedCup(INGREDIENTS.butter.gPerCup!, cupStandard);
    return [
      ["1 " + cupName + " all-purpose flour", roundGrams(flour) + " g"],
      ["1 " + cupName + " granulated sugar", roundGrams(sugar) + " g"],
      ["1 stick butter", "113 g = ½ US cup"],
      ["1 " + cupName + " butter", roundGrams(butterCup) + " g"],
      ["1 oz (weight)", formatNumber(OZ_G, 2) + " g"],
      ["1 fl oz (volume)", formatNumber(FLOZ_ML, 2) + " mL"],
      ["1 tbsp", formatNumber(TBSP_ML, 2) + " mL"],
      ["1 tsp", formatNumber(TSP_ML, 2) + " mL"],
      ["Oven 180 °C", "356 °F · Gas Mark 4 · fan ≈ 160 °C"],
      ["Oven 350 °F", "177 °C · Gas Mark 4 · fan ≈ 325 °F"],
      ["Oven 200 °C", "392 °F · Gas Mark 6 · fan ≈ 180 °C"],
    ] as [string, string][];
  }, [cupStandard]);

  async function copyResult() {
    const text = [activeResult.precise, activeResult.friendly].filter(Boolean).join(" · ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy result:", text);
    }
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1400);
  }

  const modes: { id: ConverterMode; label: string }[] = [
    { id: "ingredient", label: "Ingredient" },
    { id: "weight", label: "Weight" },
    { id: "volume", label: "Volume" },
    { id: "temp", label: "Temp" },
  ];

  const body = expanded ? (
    <>
      <div className="kcc-toolbar">
        {!isModal && (
          <>
            <button type="button" className="kcc-text-link" onClick={() => setView("modal")}>
              Open in larger window
            </button>
            <span className="kcc-toolbar-sep" aria-hidden="true">|</span>
          </>
        )}
        <button
          type="button"
          className="kcc-text-link"
          onClick={() => setView(isModal ? "inline" : "collapsed")}
        >
          {isModal ? "Close larger view" : "Collapse"}
        </button>
      </div>

      <div className="kcc-bar">
        <div className="kcc-cup-toggle" role="group" aria-label="Cup standard">
          <button type="button" aria-pressed={cupStandard === "us"} onClick={() => setCupStandard("us")}>
            US cup
          </button>
          <button type="button" aria-pressed={cupStandard === "metric"} onClick={() => setCupStandard("metric")}>
            Metric cup
          </button>
        </div>
        <p className="kcc-hint">{cupStandard === "metric" ? "Metric cup = 250 mL" : "US cup = 236.588 mL"}</p>
      </div>

      <div className="kcc-modes" role="tablist" aria-label="Conversion mode">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`kcc-tab-${m.id}`}
            aria-controls={`kcc-panel-${m.id}`}
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "ingredient" && (
        <section className="kcc-panel is-active" id="kcc-panel-ingredient" role="tabpanel" aria-labelledby="kcc-tab-ingredient">
          <div className="kcc-field">
            <label htmlFor="kcc-ingredient-search">Ingredient</label>
            <div className="kcc-combo">
              <input
                id="kcc-ingredient-search"
                ref={searchRef}
                type="search"
                autoComplete="off"
                placeholder="Search ingredients…"
                aria-autocomplete="list"
                aria-controls="kcc-ingredient-list"
                value={ingSearch}
                onChange={(e) => {
                  setIngSearch(e.target.value);
                  setListOpen(true);
                }}
                onFocus={() => setListOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setListOpen(false);
                }}
              />
              <ul className={`kcc-combo-list${listOpen ? " is-open" : ""}`} id="kcc-ingredient-list" role="listbox">
                {filteredIngredients.map((e) => (
                  <li key={e.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={e.key === ingredientKey}
                      onClick={() => pickIngredient(e.key)}
                    >
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="kcc-hint">{densityNote}</p>
          </div>
          {ingredientKey === "custom" && (
            <div className="kcc-field">
              <label htmlFor="kcc-custom-density">Custom grams per cup</label>
              <input
                id="kcc-custom-density"
                type="number"
                min={1}
                step={1}
                inputMode="decimal"
                placeholder="e.g. 140"
                value={customDensity}
                onChange={(e) => setCustomDensity(e.target.value)}
              />
            </div>
          )}
          <div className="kcc-row amount">
            <div className="kcc-field">
              <label htmlFor="kcc-ing-amount">Amount</label>
              <input
                id="kcc-ing-amount"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={ingAmount}
                onChange={(e) => setIngAmount(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="kcc-swap"
              title="Swap direction"
              aria-label="Swap conversion direction"
              onClick={() => {
                setIngUnit(ingTo);
                setIngTo(ingUnit);
              }}
            >
              ⇄
            </button>
            <div className="kcc-field">
              <label htmlFor="kcc-ing-unit">Unit</label>
              <select id="kcc-ing-unit" value={activeIngUnit} onChange={(e) => setIngUnit(e.target.value)}>
                {Object.entries(ingUnitOptions).map(([key, u]) => (
                  <option key={key} value={key}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="kcc-field">
            <label htmlFor="kcc-ing-to">Convert to</label>
            <select id="kcc-ing-to" value={activeIngTo} onChange={(e) => setIngTo(e.target.value)}>
              {Object.entries(ingUnitOptions).map(([key, u]) => (
                <option key={key} value={key}>{u.label}</option>
              ))}
            </select>
          </div>
          <ResultBlock result={ingResult} />
          <CopyButton done={copied === "ingredient"} onCopy={copyResult} />
        </section>
      )}

      {mode === "weight" && (
        <section className="kcc-panel is-active" id="kcc-panel-weight" role="tabpanel" aria-labelledby="kcc-tab-weight">
          <div className="kcc-row amount">
            <div className="kcc-field">
              <label htmlFor="kcc-wt-amount">Amount</label>
              <input
                id="kcc-wt-amount"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={wtAmount}
                onChange={(e) => setWtAmount(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="kcc-swap"
              title="Swap direction"
              aria-label="Swap conversion direction"
              onClick={() => {
                setWtUnit(wtTo);
                setWtTo(wtUnit);
              }}
            >
              ⇄
            </button>
            <div className="kcc-field">
              <label htmlFor="kcc-wt-unit">From</label>
              <select id="kcc-wt-unit" value={wtUnit} onChange={(e) => setWtUnit(e.target.value)}>
                {Object.entries(wtUnitOptions).map(([key, u]) => (
                  <option key={key} value={key}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="kcc-field">
            <label htmlFor="kcc-wt-to">To</label>
            <select id="kcc-wt-to" value={wtTo} onChange={(e) => setWtTo(e.target.value)}>
              {Object.entries(wtUnitOptions).map(([key, u]) => (
                <option key={key} value={key}>{u.label}</option>
              ))}
            </select>
          </div>
          <ResultBlock result={wtResult} />
          <CopyButton done={copied === "weight"} onCopy={copyResult} />
        </section>
      )}

      {mode === "volume" && (
        <section className="kcc-panel is-active" id="kcc-panel-volume" role="tabpanel" aria-labelledby="kcc-tab-volume">
          <div className="kcc-row amount">
            <div className="kcc-field">
              <label htmlFor="kcc-vol-amount">Amount</label>
              <input
                id="kcc-vol-amount"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={volAmount}
                onChange={(e) => setVolAmount(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="kcc-swap"
              title="Swap direction"
              aria-label="Swap conversion direction"
              onClick={() => {
                setVolUnit(volTo);
                setVolTo(volUnit);
              }}
            >
              ⇄
            </button>
            <div className="kcc-field">
              <label htmlFor="kcc-vol-unit">From</label>
              <select id="kcc-vol-unit" value={activeVolUnit} onChange={(e) => setVolUnit(e.target.value)}>
                {Object.entries(volUnitOptions).map(([key, u]) => (
                  <option key={key} value={key}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="kcc-field">
            <label htmlFor="kcc-vol-to">To</label>
            <select id="kcc-vol-to" value={activeVolTo} onChange={(e) => setVolTo(e.target.value)}>
              {Object.entries(volUnitOptions).map(([key, u]) => (
                <option key={key} value={key}>{u.label}</option>
              ))}
            </select>
          </div>
          <ResultBlock result={volResult} />
          <CopyButton done={copied === "volume"} onCopy={copyResult} />
        </section>
      )}

      {mode === "temp" && (
        <section className="kcc-panel is-active" id="kcc-panel-temp" role="tabpanel" aria-labelledby="kcc-tab-temp">
          <div className="kcc-row amount">
            <div className="kcc-field">
              <label htmlFor="kcc-temp-amount">Temperature</label>
              <input
                id="kcc-temp-amount"
                type="number"
                step="any"
                inputMode="decimal"
                value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="kcc-swap"
              title="Swap direction"
              aria-label="Swap conversion direction"
              onClick={() => {
                setTempUnit(tempTo);
                setTempTo(tempUnit);
              }}
            >
              ⇄
            </button>
            <div className="kcc-field">
              <label htmlFor="kcc-temp-unit">From</label>
              <select id="kcc-temp-unit" value={tempUnit} onChange={(e) => setTempUnit(e.target.value)}>
                <option value="c">Celsius (°C)</option>
                <option value="f">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>
          <div className="kcc-field">
            <label htmlFor="kcc-temp-to">To</label>
            <select id="kcc-temp-to" value={tempTo} onChange={(e) => setTempTo(e.target.value)}>
              <option value="f">Fahrenheit (°F)</option>
              <option value="c">Celsius (°C)</option>
            </select>
          </div>
          <ResultBlock result={tempResult} />
          <CopyButton done={copied === "temp"} onCopy={copyResult} />
        </section>
      )}

      <div className="kcc-ref">
        <h3>Quick reference</h3>
        <table className="kcc-ref-table">
          <tbody>
            {refRows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : null;

  if (isModal) {
    return (
      <>
        <div className="kcc is-collapsed kcc-placeholder" aria-hidden="true">
          <div className="kcc-head">
            <p className="kcc-title">Kitchen Conversion Calculator</p>
            <p className="kcc-lede">Open in the larger window above.</p>
          </div>
        </div>
        {createPortal(
          <div className="kcc-modal-backdrop" role="presentation" onClick={() => setView("inline")}>
            <div
              className="kcc-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="kcc-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="kcc is-expanded is-modal" id="kcc-root" ref={rootRef}>
                <div className="kcc-head">
                  <h2 className="kcc-title" id="kcc-modal-title">Kitchen Conversion Calculator</h2>
                  <p className="kcc-lede">Convert weights, volumes, temperatures, and ingredient amounts for cooking and baking.</p>
                </div>
                {body}
              </div>
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <div
      className={`kcc${expanded ? " is-expanded" : " is-collapsed"}`}
      id="kcc-root"
      ref={rootRef}
    >
      {expanded ? (
        <div className="kcc-head">
          <h2 className="kcc-title">Kitchen Conversion Calculator</h2>
          <p className="kcc-lede">Convert weights, volumes, temperatures, and ingredient amounts for cooking and baking.</p>
        </div>
      ) : (
        <button
          type="button"
          className="kcc-collapsed-btn"
          aria-expanded={false}
          onClick={() => setView("inline")}
        >
          <span className="kcc-title">Kitchen Conversion Calculator</span>
          <span className="kcc-lede">Convert weights, volumes, temperatures, and ingredient amounts for cooking and baking.</span>
          <span className="kcc-expand-hint">Click to expand</span>
        </button>
      )}
      {body}
    </div>
  );
}

function ResultBlock({ result }: { result: ResultView }) {
  return (
    <div className="kcc-results" aria-live="polite">
      <p className="kcc-precise">{result.precise}</p>
      {result.friendly ? <p className="kcc-friendly">{result.friendly}</p> : null}
      {result.note ? <p className="kcc-note">{result.note}</p> : null}
      {result.footnote ? <p className="kcc-footnote">{result.footnote}</p> : null}
    </div>
  );
}

function CopyButton({ done, onCopy }: { done: boolean; onCopy: () => void }) {
  return (
    <div className="kcc-actions">
      <button type="button" className={`kcc-copy${done ? " is-done" : ""}`} onClick={onCopy}>
        {done ? "Copied!" : "Copy result"}
      </button>
    </div>
  );
}
