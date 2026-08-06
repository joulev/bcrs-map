import { openSync } from "fontkit";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import mrtData from "../src/data/sg-rail.geo.json";

interface MrtData {
  features: Array<{
    geometry: { type: string };
    properties: { station_codes?: string };
  }>;
}

const fontPath = fileURLToPath(
  new URL(
    "../node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2",
    import.meta.url,
  ),
);
const outputPath = fileURLToPath(
  new URL("../src/mrt-station-code-glyphs.generated.ts", import.meta.url),
);
const fontAsset = openSync(fontPath);
if ("fonts" in fontAsset) {
  throw new Error("Expected a single Noto Sans Bold font, received a collection");
}
const font = fontAsset;
const labels = (mrtData as MrtData).features.flatMap((feature) =>
  feature.geometry.type === "Point" && feature.properties.station_codes
    ? feature.properties.station_codes.split(/[-:]/).filter(Boolean)
    : [],
);
const characters = Array.from(new Set(labels.join(""))).sort();
const pairs = Array.from(
  new Set(
    labels.flatMap((label) =>
      Array.from({ length: Math.max(0, label.length - 1) }, (_, index) =>
        label.slice(index, index + 2),
      ),
    ),
  ),
).sort();

const glyphs = Object.fromEntries(
  characters.map((character) => {
    const glyph = font.glyphForCodePoint(character.codePointAt(0)!);
    return [
      character,
      {
        advanceWidth: glyph.advanceWidth,
        path: glyph.path.toSVG(),
      },
    ];
  }),
);
const kerning = Object.fromEntries(
  pairs.flatMap((pair) => {
    const run = font.layout(pair);
    const firstGlyph = run.glyphs[0];
    const firstPosition = run.positions[0];
    if (!firstGlyph || !firstPosition) return [];
    const adjustment = firstPosition.xAdvance - firstGlyph.advanceWidth;
    return adjustment === 0 ? [] : [[pair, adjustment]];
  }),
);

const source = `// Generated from Noto Sans 700 by bun run generate:mrt-badge-glyphs.\nexport const MRT_STATION_CODE_FONT_METRICS = ${JSON.stringify(
  {
    capHeight: font.capHeight,
    unitsPerEm: font.unitsPerEm,
  },
  null,
  2,
)} as const;\n\nexport const MRT_STATION_CODE_GLYPHS = ${JSON.stringify(
  glyphs,
  null,
  2,
)} as const;\n\nexport const MRT_STATION_CODE_KERNING = ${JSON.stringify(
  kerning,
  null,
  2,
)} as const;\n`;

await writeFile(outputPath, source);
