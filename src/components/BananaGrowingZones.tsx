"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoContains, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import statesTopology from "us-atlas/states-10m.json";

interface BananaVariety {
  id: string;
  name: string;
  zoneMin: number;
  zoneMax: number;
  rangeLabel: string;
  note?: string;
  attrs: Record<AttributeKey, string>;
}

type AttributeKey =
  | "lowTemperature"
  | "highTemperature"
  | "sunExposure"
  | "moisture"
  | "soil"
  | "growthRate"
  | "matureHeight"
  | "matureSpread"
  | "bloomPeriod"
  | "pruning"
  | "petSafe"
  | "lifeCycle"
  | "evergreen";

type ZoneProperties = {
  zone: string;
  [key: string]: unknown;
};

type Geometry = {
  type: string;
  coordinates?: unknown;
  geometries?: Geometry[];
  [key: string]: unknown;
};

interface Feature<Properties = Record<string, unknown>> {
  type: "Feature";
  geometry: Geometry;
  properties: Properties;
  id?: string | number;
  bbox?: number[];
}

interface FeatureCollection<Properties = Record<string, unknown>> {
  type: "FeatureCollection";
  features: Feature<Properties>[];
  bbox?: number[];
}

interface TopoGeometry<Properties = Record<string, unknown>> {
  type: string;
  properties?: Properties;
  [key: string]: unknown;
}

interface TopoGeometryCollection<Properties = Record<string, unknown>> {
  type: "GeometryCollection";
  geometries: TopoGeometry<Properties>[];
  [key: string]: unknown;
}

interface Topology<Objects extends Record<string, unknown>> {
  type: "Topology";
  objects: Objects;
  arcs: unknown[];
  transform?: unknown;
  bbox?: number[];
}

type ZoneFeature = Feature<ZoneProperties>;
type ZoneCollection = FeatureCollection<ZoneProperties>;
type ZoneTopology = Topology<{ zones: TopoGeometryCollection<ZoneProperties> }>;

interface ZoneLookupResult {
  zone: string;
  temperature_range?: string;
  coordinates?: {
    lat: string | number;
    lon: string | number;
  };
}

interface LocatedZone {
  zone: string;
  lat: number;
  lon: number;
  source: "zip" | "geo";
}

interface TooltipState {
  zone: string;
  x: number;
  y: number;
}

const DATA_FILES = [
  "/data/banana-growing-zones/zones-us.topojson",
  "/data/banana-growing-zones/zones-ak.topojson",
  "/data/banana-growing-zones/zones-hi.topojson",
] as const;

const WIDTH = 960;
const HEIGHT = 610;

const DEFAULT_ATTRS: Record<AttributeKey, string> = {
  lowTemperature: "Varies by zone and protection",
  highTemperature: "95°F+ with steady water",
  sunExposure: "Full Sun",
  moisture: "Medium to High",
  soil: "Moist, fertile, well-draining soil",
  growthRate: "Fast",
  matureHeight: "Varies by cultivar",
  matureSpread: "Varies by cultivar",
  bloomPeriod: "Spring to Summer",
  pruning: "Remove dead or wind-tattered leaves. After flowering or fruiting, cut the spent pseudostem so pups can take over.",
  petSafe: "Yes",
  lifeCycle: "Perennial",
  evergreen: "Evergreen in frost-free zones",
};

function varietyAttrs(overrides: Partial<Record<AttributeKey, string>>): Record<AttributeKey, string> {
  return { ...DEFAULT_ATTRS, ...overrides };
}

// Seed value supplied for launch. Verify cultivar details before using as horticultural advice.
// Additional varieties are summarized from the Gardenia banana hardiness guide linked in docs.
export const BANANA_VARIETIES: BananaVariety[] = [
  {
    id: "mona-lisa",
    name: "Musa 'Mona Lisa' (FHIA-02)",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    attrs: varietyAttrs({
      lowTemperature: "40°F",
      highTemperature: "+100°F",
      sunExposure: "Full Sun",
      moisture: "High",
      soil: "Rich, loamy, well-draining soil",
      growthRate: "Fast",
      matureHeight: "7 to 12 feet",
      matureSpread: "8 to 10 feet",
      bloomPeriod: "Spring to Summer",
      pruning:
        "Remove dead or wind-tattered leaves as needed. Once fruiting is done, cut that pseudostem down to the ground so pups can take over.",
      petSafe: "Yes",
      lifeCycle: "Perennial",
      evergreen: "Evergreen",
    }),
  },
  {
    id: "dwarf-cavendish",
    name: "Musa acuminata 'Dwarf Cavendish'",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    note: "Gardenia notes reliable fruiting in Zones 10-11; Zone 9b needs protection.",
    attrs: varietyAttrs({
      lowTemperature: "Around 30°F, protect from freezes",
      highTemperature: "+100°F",
      sunExposure: "Full Sun",
      moisture: "High",
      soil: "Rich, moist, well-draining soil",
      growthRate: "Fast",
      matureHeight: "6 to 8 feet",
      matureSpread: "5 to 6 feet",
      bloomPeriod: "Spring to Summer",
      pruning: "Remove spent leaves. After fruiting, cut the finished pseudostem and let a healthy pup replace it.",
      petSafe: "Yes",
      lifeCycle: "Perennial",
      evergreen: "Evergreen",
    }),
  },
  {
    id: "blue-java",
    name: "Musa acuminata x balbisiana 'Blue Java'",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    note: "Also called Ice Cream Banana; best fruiting in Zones 10-11.",
    attrs: varietyAttrs({
      lowTemperature: "Around 30°F, protect from freezes",
      highTemperature: "+100°F",
      sunExposure: "Full Sun",
      moisture: "High",
      soil: "Rich, evenly moist, well-draining soil",
      growthRate: "Fast",
      matureHeight: "12 to 20 feet",
      matureSpread: "8 to 12 feet",
      bloomPeriod: "Spring to Summer",
      pruning: "Trim ragged leaves. Remove the fruited pseudostem so the next sucker gets the spotlight.",
      petSafe: "Yes",
      lifeCycle: "Perennial",
      evergreen: "Evergreen",
    }),
  },
  {
    id: "dessert-banana",
    name: "Musa acuminata (Dessert Banana)",
    zoneMin: 10,
    zoneMax: 11,
    rangeLabel: "Zones 10-11",
    attrs: varietyAttrs({
      lowTemperature: "30°F to 40°F",
      highTemperature: "+100°F",
      moisture: "High",
      matureHeight: "12 to 20 feet",
      matureSpread: "6 to 10 feet",
      pruning: "Keep one fruiting stem, one follower, and one pup when possible. Remove the spent fruiting stem after harvest.",
    }),
  },
  {
    id: "basjoo",
    name: "Musa basjoo (Japanese Fiber Banana)",
    zoneMin: 5,
    zoneMax: 10,
    rangeLabel: "Zones 5-10",
    note: "Root-hardy with heavy mulch",
    attrs: varietyAttrs({
      lowTemperature: "-20°F roots, with mulch",
      highTemperature: "95°F+",
      sunExposure: "Full Sun to Part Shade",
      moisture: "Medium to High",
      soil: "Moist, fertile, well-draining soil",
      growthRate: "Fast",
      matureHeight: "6 to 15 feet",
      matureSpread: "6 to 15 feet",
      bloomPeriod: "Summer",
      pruning: "In cold zones, cut stems after frost and mulch the crown heavily. In warm zones, remove spent stems after flowering.",
      petSafe: "Yes",
      lifeCycle: "Perennial",
      evergreen: "Deciduous in cold zones",
    }),
  },
  {
    id: "plantain",
    name: "Musa x paradisiaca (Plantain)",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    note: "Needs warm, long seasons for dependable fruit.",
    attrs: varietyAttrs({
      lowTemperature: "Around 30°F, protect from freezes",
      highTemperature: "+100°F",
      moisture: "High",
      matureHeight: "7 to 25 feet",
      matureSpread: "6 to 10 feet",
      pruning: "After harvest, remove the spent pseudostem and keep the strongest pups for the next crop.",
    }),
  },
  {
    id: "velutina",
    name: "Musa velutina (Pink Banana)",
    zoneMin: 7,
    zoneMax: 11,
    rangeLabel: "Zones 7-11",
    note: "Pink ornamental fruit is seedy; container protection is wise outside mild zones.",
    attrs: varietyAttrs({
      lowTemperature: "0°F to +10°F with protection",
      matureHeight: "4 to 8 feet",
      matureSpread: "3 to 5 feet",
      bloomPeriod: "Summer to Fall",
      pruning: "Deadhead if you do not want self-sown seedlings in frost-free gardens.",
    }),
  },
  {
    id: "ornata",
    name: "Musa ornata (Flowering Banana)",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    note: "Ornamental, grown for pink-lilac bracts rather than edible fruit.",
    attrs: varietyAttrs({
      lowTemperature: "Around 30°F, protect from freezes",
      matureHeight: "6 to 9 feet",
      matureSpread: "5 to 7 feet",
      bloomPeriod: "Summer to Fall",
      pruning: "Remove faded bracts and ragged leaves to keep the clump tidy.",
    }),
  },
  {
    id: "coccinea",
    name: "Musa coccinea (Scarlet Banana)",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    note: "Tender ornamental with scarlet torch-like bracts.",
    attrs: varietyAttrs({
      lowTemperature: "Around 30°F, protect from freezes",
      sunExposure: "Full Sun to Part Shade",
      matureHeight: "3 to 8 feet",
      matureSpread: "3 to 5 feet",
      bloomPeriod: "Summer to Fall",
      pruning: "Cut out faded flower stems and protect from wind so the display stays tidy.",
    }),
  },
  {
    id: "zebrina",
    name: "Musa acuminata 'Zebrina' (Blood Banana)",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    note: "Best as a container or frost-free foliage plant outside the subtropics.",
    attrs: varietyAttrs({
      lowTemperature: "Around 30°F, protect from freezes",
      matureHeight: "5 to 8 feet",
      matureSpread: "5 to 8 feet",
      bloomPeriod: "Summer",
      pruning: "Remove damaged leaves and shelter from wind to protect the mottled foliage.",
    }),
  },
  {
    id: "musella-lasiocarpa",
    name: "Musella lasiocarpa (Chinese Yellow Banana)",
    zoneMin: 7,
    zoneMax: 10,
    rangeLabel: "Zones 7-10",
    note: "Ornamental lotus-like bloom; occasionally survives Zone 6 with protection.",
    attrs: varietyAttrs({
      lowTemperature: "0°F to +10°F with deep mulch",
      highTemperature: "95°F+",
      sunExposure: "Full Sun to Part Shade",
      matureHeight: "3 to 6 feet",
      matureSpread: "3 to 5 feet",
      bloomPeriod: "Summer",
      pruning: "Cut back frost-damaged top growth and mulch the crown in cold gardens.",
      evergreen: "Deciduous in cold zones",
    }),
  },
  {
    id: "sikkimensis",
    name: "Musa sikkimensis (Darjeeling Banana)",
    zoneMin: 7,
    zoneMax: 9,
    rangeLabel: "Zones 7-9",
    note: "Cold-tolerant ornamental; edible fruit is uncommon outside the tropics.",
    attrs: varietyAttrs({
      lowTemperature: "0°F to +10°F with mulch",
      highTemperature: "95°F+",
      matureHeight: "12 to 20 feet",
      matureSpread: "8 to 12 feet",
      pruning: "Mulch the crown in winter and remove battered leaves after storms or freezes.",
      evergreen: "Deciduous in cold zones",
    }),
  },
  {
    id: "dwarf-orinoco",
    name: "Dwarf Orinoco",
    zoneMin: 8,
    zoneMax: 11,
    rangeLabel: "Zones 8-11",
    note: "Tough edible banana; fruits best in Zones 9-11.",
    attrs: varietyAttrs({
      lowTemperature: "+10°F to +20°F rhizome survival",
      highTemperature: "+100°F",
      matureHeight: "8 to 10 feet",
      matureSpread: "6 to 8 feet",
      pruning: "Keep warm successor pups and protect developing bunches from early frost.",
    }),
  },
  {
    id: "namwa",
    name: "Namwa",
    zoneMin: 8,
    zoneMax: 11,
    rangeLabel: "Zones 8-11",
    note: "Reliable warm-temperate edible banana with good flavor.",
    attrs: varietyAttrs({
      lowTemperature: "+10°F to +20°F rhizome survival",
      highTemperature: "+100°F",
      moisture: "High",
      matureHeight: "10 to 12 feet",
      matureSpread: "6 to 8 feet",
      pruning: "Protect stems in Zone 8 and remove the fruited stem after harvest.",
    }),
  },
  {
    id: "raja-puri",
    name: "Raja Puri",
    zoneMin: 8,
    zoneMax: 11,
    rangeLabel: "Zones 8-11",
    note: "Compact, early fruiting choice for warm patios and Zone 9 gardens.",
    attrs: varietyAttrs({
      lowTemperature: "+10°F to +20°F rhizome survival",
      highTemperature: "+100°F",
      matureHeight: "8 to 10 feet",
      matureSpread: "6 to 8 feet",
      pruning: "Protect in marginal zones and keep the strongest pups for the next fruiting cycle.",
    }),
  },
  {
    id: "ensete-ventricosum",
    name: "Ensete ventricosum (Abyssinian Banana)",
    zoneMin: 9,
    zoneMax: 11,
    rangeLabel: "Zones 9-11",
    note: "Spectacular ornamental foliage; not rhizome-hardy like Musa in freezes.",
    attrs: varietyAttrs({
      lowTemperature: "Around 30°F, lift or containerize in cooler zones",
      highTemperature: "95°F+",
      matureHeight: "10 to 15 feet",
      matureSpread: "8 to 12 feet",
      bloomPeriod: "Foliage feature",
      pruning: "Remove tattered leaves. Lift, store, or grow in a container where winters freeze.",
      evergreen: "Evergreen only in frost-free zones",
    }),
  },
];

const ATTRIBUTES: Array<{ key: AttributeKey; label: string; icon: string }> = [
  { key: "lowTemperature", label: "Low Temperature", icon: "thermoLow" },
  { key: "highTemperature", label: "High Temperature", icon: "thermoHigh" },
  { key: "sunExposure", label: "Sun Exposure", icon: "sun" },
  { key: "moisture", label: "Moisture", icon: "drop" },
  { key: "soil", label: "Soil", icon: "soil" },
  { key: "growthRate", label: "Growth Rate", icon: "sprout" },
  { key: "matureHeight", label: "Mature Height", icon: "height" },
  { key: "matureSpread", label: "Mature Spread", icon: "spread" },
  { key: "bloomPeriod", label: "Bloom Period", icon: "flower" },
  { key: "pruning", label: "Pruning", icon: "shears" },
  { key: "petSafe", label: "Pet Safe", icon: "heart" },
  { key: "lifeCycle", label: "Perennial / Annual", icon: "tree" },
  { key: "evergreen", label: "Evergreen / Deciduous", icon: "leaf" },
];

const ZONE_LABELS = [
  { zone: 1, lon: -151.5, lat: 64.5 },
  { zone: 2, lon: -155, lat: 59.5 },
  { zone: 3, lon: -104, lat: 47.5 },
  { zone: 4, lon: -111, lat: 45 },
  { zone: 5, lon: -99, lat: 42 },
  { zone: 6, lon: -96, lat: 38 },
  { zone: 7, lon: -91, lat: 35 },
  { zone: 8, lon: -83, lat: 32.5 },
  { zone: 9, lon: -120, lat: 35 },
  { zone: 10, lon: -116, lat: 33 },
  { zone: 11, lon: -157.8, lat: 21.5 },
  { zone: 12, lon: -155.5, lat: 19.7 },
  { zone: 13, lon: -80.5, lat: 25.4 },
] as const;

const ZONE_FILES_DESCRIPTION =
  "Derived and simplified from 2023 USDA Plant Hardiness Zone GIS data produced by the PRISM Group at Oregon State University. This is not the official USDA Plant Hardiness Zone Map.";

function zoneMajor(zone: string): number {
  const n = Number.parseInt(zone, 10);
  return Number.isFinite(n) ? n : 0;
}

function zoneValue(zone: string): number {
  const major = zoneMajor(zone);
  return zone.endsWith("b") ? major + 0.5 : major;
}

function zoneClass(zone: string): string {
  return `z${zoneMajor(zone)}`;
}

function isInRange(zone: string, variety: BananaVariety): boolean {
  const major = zoneMajor(zone);
  return major >= variety.zoneMin && major <= variety.zoneMax;
}

function halfZoneTemperature(zone: string): string {
  const major = zoneMajor(zone);
  const lower = -60 + (major - 1) * 10 + (zone.endsWith("b") ? 5 : 0);
  const upper = lower + 5;
  return `${signed(lower)}°F to ${signed(upper)}°F`;
}

function zoneTemperature(zone: number): string {
  const lower = -60 + (zone - 1) * 10;
  const upper = lower + 10;
  return `${signed(lower)}°F to ${signed(upper)}°F`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function verdictForZone(zone: string, variety: BananaVariety): { tone: "yes" | "maybe" | "no"; text: string } {
  if (isInRange(zone, variety)) {
    return { tone: "yes", text: `You're in zone ${zone}. Plant it in the ground and go bananas.` };
  }
  const colderBy = variety.zoneMin - zoneValue(zone);
  if (colderBy > 0 && colderBy <= 2) {
    return { tone: "maybe", text: `Zone ${zone}. Doable in a big pot. Bring it inside before frost.` };
  }
  return { tone: "no", text: `Zone ${zone}. That's a houseplant situation, friend.` };
}

function zoneTooltip(zone: string, variety: BananaVariety): string {
  const verdict = isInRange(zone, variety)
    ? `${variety.name} can live outdoors here.`
    : `${variety.name} needs protection here.`;
  return `Zone ${zone}: ${halfZoneTemperature(zone)}. ${verdict}`;
}

function featureLabel(zone: string, variety: BananaVariety): string {
  return `Zone ${zone}, ${halfZoneTemperature(zone)}. ${isInRange(zone, variety) ? "In range" : "Out of range"} for ${variety.name}.`;
}

function iconPath(name: string) {
  switch (name) {
    case "thermoLow":
      return <path d="M10 3v10.2a5 5 0 1 0 4 0V3a2 2 0 0 0-4 0Zm2 12.5V7" />;
    case "thermoHigh":
      return <path d="M12 2v3m0 10.5V7m-4-1 2 2m6-2-2 2m-5 9a4 4 0 1 0 6 0V7a3 3 0 0 0-6 0v10Z" />;
    case "sun":
      return <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" />;
    case "drop":
      return <path d="M12 3s6 6.1 6 10a6 6 0 0 1-12 0c0-3.9 6-10 6-10Zm-2 11a2 2 0 0 0 3 1.7" />;
    case "soil":
      return <path d="M3 17h18M5 13c3 0 3-3 6-3s3 3 6 3M7 21h10M8 7h8M10 3h4" />;
    case "sprout":
      return <path d="M12 21V10m0 0C8 10 6 8 6 4c4 0 6 2 6 6Zm0 0c4 0 6-2 6-6-4 0-6 2-6 6Z" />;
    case "height":
      return <path d="M12 3v18m-4-4 4 4 4-4M8 7l4-4 4 4M5 21h14M5 3h14" />;
    case "spread":
      return <path d="M3 12h18M7 8l-4 4 4 4m10-8 4 4-4 4" />;
    case "flower":
      return <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v8m0-15V3m3 5 3-3m-9 3L6 5m9 6 4 2m-10-2-4 2m9 1 2 4m-8-4-2 4" />;
    case "shears":
      return <path d="m14 14 7-7M9 9 3 3m8 11-3 3m-1-7a3 3 0 1 1-4.2 4.2A3 3 0 0 1 7 10Zm7 7a3 3 0 1 0 4.2-4.2A3 3 0 0 0 14 17Z" />;
    case "heart":
      return <path d="M12 20s-7-4.2-8.7-8.5C2.1 8.4 4.1 5.5 7.1 5.5c1.8 0 3.3 1 4.4 2.5 1.1-1.5 2.6-2.5 4.4-2.5 3 0 5 2.9 3.8 6C19 15.8 12 20 12 20Z" />;
    case "tree":
      return <path d="M12 21v-6M8 15h8a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.4A3.5 3.5 0 0 0 8 15Z" />;
    default:
      return <path d="M12 21v-8m0 0c-4 0-7-2-7-7 5 0 7 3 7 7Zm0 0c4 0 7-2 7-7-5 0-7 3-7 7Z" />;
  }
}

function AttributeIcon({ name }: { name: string }) {
  return (
    <svg className="bgz-attr-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPath(name)}
    </svg>
  );
}

function toNumber(raw: string | number | undefined): number | null {
  if (raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function loadZoneFile(path: string): Promise<ZoneFeature[]> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}`);
  const topology = (await res.json()) as ZoneTopology;
  const collection = (feature as (topology: unknown, object: unknown) => unknown)(
    topology,
    topology.objects.zones,
  ) as ZoneCollection;
  return collection.features;
}

export function BananaGrowingZones() {
  const [selectedId, setSelectedId] = useState(BANANA_VARIETIES[0].id);
  const [zones, setZones] = useState<ZoneFeature[]>([]);
  const [loadError, setLoadError] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [finderOpen, setFinderOpen] = useState(false);
  const [zip, setZip] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [located, setLocated] = useState<LocatedZone | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const selected = BANANA_VARIETIES.find((v) => v.id === selectedId) ?? BANANA_VARIETIES[0];

  const projection = useMemo(() => geoAlbersUsa().fitSize([WIDTH, HEIGHT], { type: "Sphere" }), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const stateMesh = useMemo(() => {
    const topology = statesTopology as unknown as { objects: { states: unknown } };
    return (mesh as (topology: unknown, object: unknown, filter?: (a: unknown, b: unknown) => boolean) => unknown)(
      topology,
      topology.objects.states,
      (a, b) => a !== b,
    );
  }, []);

  const zonePaths = useMemo(
    () =>
      zones
        .map((zone) => ({
          feature: zone,
          d: path(zone as never) ?? "",
          zone: zone.properties.zone,
        }))
        .filter((zone) => zone.d),
    [path, zones],
  );

  const locatedPoint = useMemo(() => {
    if (!located) return null;
    const point = projection([located.lon, located.lat]);
    return point ? { x: point[0], y: point[1], zone: located.zone } : null;
  }, [located, projection]);

  useEffect(() => {
    let ignore = false;
    Promise.all(DATA_FILES.map(loadZoneFile))
      .then((parts) => {
        if (!ignore) setZones(parts.flat());
      })
      .catch(() => {
        if (!ignore) setLoadError("The zone map could not load. Try refreshing the page.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  function svgPoint(
    event:
      | React.PointerEvent<SVGPathElement>
      | React.FocusEvent<SVGPathElement>
      | React.MouseEvent<SVGPathElement>
      | React.KeyboardEvent<SVGPathElement>,
  ): { x: number; y: number } {
    const rect = svgRef.current?.getBoundingClientRect();
    if ("clientX" in event && rect) {
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    }
    const box = event.currentTarget.getBBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  function showTooltip(
    zone: string,
    event:
      | React.PointerEvent<SVGPathElement>
      | React.FocusEvent<SVGPathElement>
      | React.MouseEvent<SVGPathElement>
      | React.KeyboardEvent<SVGPathElement>,
  ) {
    setTooltip({ zone, ...svgPoint(event) });
  }

  async function findByZip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = zip.replace(/\D/g, "").slice(0, 5);
    if (clean.length !== 5) {
      setLookupState("error");
      setLookupMessage("Give me a 5-digit ZIP and I'll go zone hunting.");
      return;
    }
    setLookupState("loading");
    setLookupMessage("");
    try {
      const res = await fetch(`https://phzmapi.org/${clean}.json`);
      const json = (await res.json()) as ZoneLookupResult | { error?: string };
      if (!res.ok || !("zone" in json)) throw new Error("ZIP not covered");
      const lat = toNumber(json.coordinates?.lat);
      const lon = toNumber(json.coordinates?.lon);
      if (lat === null || lon === null) throw new Error("Missing coordinates");
      setLocated({ zone: json.zone, lat, lon, source: "zip" });
      setLookupState("idle");
    } catch {
      setLookupState("error");
      setLookupMessage("I couldn't find that ZIP. Try another one, or use your location.");
    }
  }

  function findContainingZone(lat: number, lon: number): string | null {
    const point: [number, number] = [lon, lat];
    const found = zones.find((zone) => geoContains(zone as never, point));
    return found?.properties.zone ?? null;
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLookupState("error");
      setLookupMessage("Your browser doesn't offer location lookup. A ZIP works too.");
      return;
    }
    setLookupState("loading");
    setLookupMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const zone = findContainingZone(latitude, longitude);
        if (!zone) {
          setLookupState("error");
          setLookupMessage("I found you, but the simplified map couldn't match a zone there.");
          return;
        }
        setLocated({ zone, lat: latitude, lon: longitude, source: "geo" });
        setLookupState("idle");
      },
      () => {
        setLookupState("error");
        setLookupMessage("Location permission was blocked. No worries — try a ZIP code.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  const locatedVerdict = located ? verdictForZone(located.zone, selected) : null;

  return (
    <section className="bgz" aria-labelledby="bgz-title">
      <div className="bgz-head">
        <div>
          <p className="bgz-kicker">Banana Growing Zones</p>
          <h2 id="bgz-title">Where Can Bananas Grow?</h2>
          <p>Pick a banana, find your zone, and see whether it belongs in the ground or in your sunniest window.</p>
        </div>
        <span className="bgz-range-pill" aria-label={`${selected.name} grows in ${selected.rangeLabel}`}>
          {selected.rangeLabel}
        </span>
      </div>

      <div className="bgz-variety-picker">
        <label htmlFor="bgz-variety">Choose a banana variety</label>
        <span className="bgz-select-wrap">
          <select id="bgz-variety" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
            {BANANA_VARIETIES.map((variety) => (
              <option key={variety.id} value={variety.id}>
                {variety.name} — {variety.rangeLabel}
              </option>
            ))}
          </select>
        </span>
        <p>{selected.note ?? "Pick a variety to update the map, verdict, and plant details."}</p>
      </div>

      <div className="bgz-map-card">
        <div className="bgz-map-toolbar">
          <div>
            <span className="bgz-toolbar-label">Your Growing Zone:</span>
            <strong>{located?.zone ? `Zone ${located.zone}` : "Not checked yet"}</strong>
          </div>
          <button type="button" className="bgz-find-btn" onClick={() => setFinderOpen((open) => !open)} aria-expanded={finderOpen} aria-controls="bgz-finder">
            Find My Zone
          </button>
        </div>

        {finderOpen ? (
          <div className="bgz-finder" id="bgz-finder">
            <form onSubmit={findByZip} className="bgz-zip-form">
              <label htmlFor="bgz-zip">ZIP code</label>
              <input
                id="bgz-zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                placeholder="90210"
              />
              <button type="submit" disabled={lookupState === "loading"}>
                {lookupState === "loading" ? "Looking..." : "Check ZIP"}
              </button>
            </form>
            <button type="button" className="bgz-location-btn" onClick={useMyLocation} disabled={lookupState === "loading"}>
              Use my location
            </button>
            <p className="bgz-live" role="status" aria-live="polite">
              {lookupMessage || (located ? verdictForZone(located.zone, selected).text : "")}
            </p>
          </div>
        ) : null}

        <div className="bgz-map-wrap">
          {loadError ? <p className="bgz-error">{loadError}</p> : null}
          <svg ref={svgRef} className="bgz-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`USDA growing zones map for ${selected.name}`}>
            <rect className="bgz-map-bg" width={WIDTH} height={HEIGHT} rx="26" />
            <g>
              {zonePaths.map(({ d, zone: zoneName }, index) => (
                <path
                  key={`${zoneName}-${index}`}
                  className={`bgz-zone ${zoneClass(zoneName)}${isInRange(zoneName, selected) ? " is-in-range" : " is-out-range"}`}
                  d={d}
                  role="button"
                  tabIndex={0}
                  aria-label={featureLabel(zoneName, selected)}
                  onPointerEnter={(event) => showTooltip(zoneName, event)}
                  onPointerMove={(event) => showTooltip(zoneName, event)}
                  onPointerLeave={() => setTooltip(null)}
                  onFocus={(event) => showTooltip(zoneName, event)}
                  onBlur={() => setTooltip(null)}
                  onClick={(event) => showTooltip(zoneName, event)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      showTooltip(zoneName, event);
                    }
                  }}
                />
              ))}
              <path className="bgz-state-lines" d={path(stateMesh as never) ?? ""} aria-hidden="true" />
            </g>
            <g aria-hidden="true">
              {ZONE_LABELS.map((label) => {
                const point = projection([label.lon, label.lat]);
                if (!point) return null;
                return (
                  <g key={label.zone} className={`bgz-zone-pin ${zoneMajor(`${label.zone}a`) >= selected.zoneMin && label.zone <= selected.zoneMax ? "is-in-range" : ""}`} transform={`translate(${point[0]} ${point[1]})`}>
                    <circle r="16" />
                    <text y="5">{label.zone}</text>
                  </g>
                );
              })}
            </g>
            {locatedPoint ? (
              <g className="bgz-banana-pin" transform={`translate(${locatedPoint.x} ${locatedPoint.y})`} aria-label={`Your location is zone ${locatedPoint.zone}`}>
                <circle r="23" />
                <text y="8">🍌</text>
              </g>
            ) : null}
          </svg>
          {tooltip ? (
            <div className="bgz-tooltip" style={{ left: `${(tooltip.x / WIDTH) * 100}%`, top: `${(tooltip.y / HEIGHT) * 100}%` }}>
              <strong>Zone {tooltip.zone}</strong>
              <span>{halfZoneTemperature(tooltip.zone)}</span>
              <p>{zoneTooltip(tooltip.zone, selected).split(". ").slice(1).join(". ")}</p>
            </div>
          ) : null}
        </div>

        {located && locatedVerdict ? (
          <div className={`bgz-verdict is-${locatedVerdict.tone}`}>
            <span aria-hidden="true">🍌</span>
            <div>
              <p className="bgz-verdict-label">{located.source === "zip" ? "ZIP check" : "Location check"}</p>
              <p>{locatedVerdict.text}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bgz-legend">
        <button type="button" className="bgz-legend-toggle" onClick={() => setLegendOpen((open) => !open)} aria-expanded={legendOpen} aria-controls="bgz-legend-scale">
          Zone scale <span aria-hidden="true">{legendOpen ? "−" : "+"}</span>
        </button>
        <div id="bgz-legend-scale" className={`bgz-legend-scale${legendOpen ? " is-open" : ""}`}>
          {Array.from({ length: 13 }, (_, i) => i + 1).map((zone) => (
            <div key={zone} className={`bgz-legend-step z${zone}`}>
              <span>{zone}</span>
              <small>{zoneTemperature(zone)}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="bgz-attrs" aria-label={`${selected.name} plant attributes`}>
        {ATTRIBUTES.map((attr) => (
          <article className="bgz-attr" key={attr.key}>
            <AttributeIcon name={attr.icon} />
            <div>
              <p>{attr.label}</p>
              <strong>{selected.attrs[attr.key]}</strong>
            </div>
          </article>
        ))}
      </div>

      {selected.note ? <p className="bgz-note">{selected.note}</p> : null}
      <p className="bgz-footnote">
        Zone data: USDA Plant Hardiness Zone Map (2023). Microclimates vary, so trust your thermometer too. {ZONE_FILES_DESCRIPTION}
      </p>
    </section>
  );
}
