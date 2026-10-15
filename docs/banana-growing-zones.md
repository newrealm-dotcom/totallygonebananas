# Banana Growing Zones

Reusable client component for showing USDA Plant Hardiness Zones and banana variety outdoor suitability.

The public page is available at `/banana-growing-zones`.

## Embed

The component is still route-agnostic. Import it wherever you want the app to appear:

```tsx
import { BananaGrowingZones } from "@/components/BananaGrowingZones";

export default function GrowingZonesBlock() {
  return <BananaGrowingZones />;
}
```

The live App Router page is `src/app/banana-growing-zones/page.tsx`, which renders the component inside a padded site wrapper. No backend, auth, or Supabase data is required.

## Add or edit banana varieties

Edit `BANANA_VARIETIES` in `src/components/BananaGrowingZones.tsx`.

Each variety has:

- `id`
- `name`
- `zoneMin` and `zoneMax`
- `rangeLabel`
- optional `note`
- `attrs` for the cards under the map

The launch seed values are commented as values to verify before treating them as horticultural advice. The extended dropdown list is summarized from Gardenia's banana hardiness guide:

https://www.gardenia.net/guide/can-banana-survive-your-winter-zone-by-zone-guide

## Zone data

Files live in `public/data/banana-growing-zones/`:

- `zones-us.topojson`
- `zones-ak.topojson`
- `zones-hi.topojson`

They are derived and simplified from the 2023 USDA Plant Hardiness Zone GIS data produced by the PRISM Group at Oregon State University.

Sources:

- USDA map: https://planthardiness.ars.usda.gov/
- PRISM GIS landing page: https://prism.oregonstate.edu/phzm/
- CONUS shapefile: https://prism.oregonstate.edu/phzm/data/2023/phzm_us_zones_shp_2023.zip
- Alaska shapefile: https://prism.oregonstate.edu/phzm/data/2023/phzm_ak_zones_shp_2023.zip
- Hawaii shapefile: https://prism.oregonstate.edu/phzm/data/2023/phzm_hi_zones_shp_2023.zip

Because these files are simplified, the UI must keep the disclaimer:

> Derived and simplified from 2023 USDA Plant Hardiness Zone GIS data produced by the PRISM Group at Oregon State University. This is not the official USDA Plant Hardiness Zone Map.

## Regenerate data

Install mapshaper on demand:

```bash
npx -y mapshaper --version
```

Download and unzip the official shapefiles, then run:

```bash
npx -y mapshaper .tmp/phzm/us/phzm_us_zones_shp_2023.shp \
  -filter-fields zone \
  -rename-layers zones \
  -filter-slivers gap-width=2.5km keep-shapes \
  -simplify weighted 1% keep-shapes \
  -clean \
  -o format=topojson quantization=1e4 public/data/banana-growing-zones/zones-us.topojson
```

```bash
npx -y mapshaper .tmp/phzm/ak/phzm_ak_zones_shp_2023.shp \
  -filter-fields zone \
  -rename-layers zones \
  -filter-slivers gap-width=10km keep-shapes \
  -simplify weighted 0.5% keep-shapes \
  -clean \
  -o format=topojson quantization=1e4 public/data/banana-growing-zones/zones-ak.topojson
```

```bash
npx -y mapshaper .tmp/phzm/hi/phzm_hi_zones_shp_2023.shp \
  -filter-fields zone \
  -rename-layers zones \
  -simplify weighted 1% keep-shapes \
  -clean \
  -o format=topojson quantization=1e4 public/data/banana-growing-zones/zones-hi.topojson
```

The current files are about 464 KB raw combined. This target requires aggressive simplification and sliver removal, so narrow local pockets and microclimates are not preserved.

## ZIP and location lookup

ZIP lookup calls:

```text
https://phzmapi.org/{zip}.json
```

The endpoint currently returns zone plus representative coordinates and supports browser CORS. It is third-party and non-authoritative, so the component handles 404/network failures with a friendly error.

Browser geolocation never leaves the device. Coordinates are matched client-side against the loaded simplified polygons and stored only in React state for the current session.

## Notes

- Map rendering uses `d3-geo`, `topojson-client`, and state borders from `us-atlas`.
- Alaska and Hawaii use `geoAlbersUsa` insets.
- Puerto Rico is not included because `geoAlbersUsa` omits it.
- Styling is scoped under `.bgz-*` in `src/app/globals.css` and uses the site's CSS variables, not Tailwind.
