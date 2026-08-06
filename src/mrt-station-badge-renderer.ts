import {
  MRT_STATION_BADGE_BORDER,
  MRT_STATION_BADGE_HEIGHT,
  MRT_STATION_CODE_BORDER_STROKE_WIDTH,
  MRT_STATION_CODE_SEPARATOR_WIDTH,
  type MrtStationCodeLayout,
  getMrtStationBadgeLayout,
  getMrtStationCodeBorderPath,
  getMrtStationCodeFillPath,
  getMrtStationCodeTextLayout,
  getMrtStationCodeTransform,
  getMrtStationPartConnectorGeometry,
} from './mrt-station-badge-layout';
import {
  MRT_STATION_CODE_FONT_METRICS,
  MRT_STATION_CODE_GLYPHS,
  MRT_STATION_CODE_KERNING,
} from './mrt-station-code-glyphs.generated';

type GlyphCharacter = keyof typeof MRT_STATION_CODE_GLYPHS;
type KerningPair = keyof typeof MRT_STATION_CODE_KERNING;

interface PositionedGlyph {
  character: GlyphCharacter;
  x: number;
}

interface StationCodeGlyphLayout {
  glyphs: PositionedGlyph[];
  width: number;
}

let scratchCanvas: HTMLCanvasElement | null = null;
const paths = new Map<string, Path2D>();

function getScratchCanvas() {
  scratchCanvas ??= document.createElement('canvas');
  return scratchCanvas;
}

function getPath(pathData: string) {
  const cachedPath = paths.get(pathData);
  if (cachedPath) return cachedPath;

  const path = new Path2D(pathData);
  paths.set(pathData, path);
  return path;
}

function getGlyph(character: string) {
  if (!Object.hasOwn(MRT_STATION_CODE_GLYPHS, character)) {
    throw new Error(`Missing MRT station badge glyph for ${character}`);
  }
  return MRT_STATION_CODE_GLYPHS[character as GlyphCharacter];
}

function getKerning(pair: string) {
  if (!Object.hasOwn(MRT_STATION_CODE_KERNING, pair)) return 0;
  return MRT_STATION_CODE_KERNING[pair as KerningPair];
}

export function getStationCodeGlyphLayout(
  code: MrtStationCodeLayout,
): StationCodeGlyphLayout {
  const { fontSize, gapBeforeIndex, gapWidth, label } =
    getMrtStationCodeTextLayout(code);
  const fontScale = fontSize / MRT_STATION_CODE_FONT_METRICS.unitsPerEm;
  const gapInFontUnits = gapWidth / fontScale;
  const glyphs: PositionedGlyph[] = [];
  let cursor = 0;

  for (const [index, character] of Array.from(label).entries()) {
    if (index === gapBeforeIndex) cursor += gapInFontUnits;
    if (index > 0) cursor += getKerning(label.slice(index - 1, index + 1));

    const typedCharacter = character as GlyphCharacter;
    const glyph = getGlyph(character);
    glyphs.push({ character: typedCharacter, x: cursor });
    cursor += glyph.advanceWidth;
  }

  return { glyphs, width: cursor };
}

function drawStationCodeShape(
  context: CanvasRenderingContext2D,
  code: MrtStationCodeLayout,
) {
  const { scale } = getMrtStationCodeTransform(code);

  context.save();
  context.translate(code.x, 0);
  context.scale(scale, scale);
  context.translate(-code.viewBox.minX, -code.viewBox.minY);
  context.strokeStyle = '#ffffff';
  context.lineWidth = MRT_STATION_CODE_BORDER_STROKE_WIDTH;
  context.lineCap = 'butt';
  context.lineJoin = 'round';
  context.stroke(getPath(getMrtStationCodeBorderPath(code.position)));
  context.fillStyle = code.colour.bg;
  context.fill(getPath(getMrtStationCodeFillPath(code.position)), 'evenodd');
  context.restore();
}

function drawStationCodeText(
  context: CanvasRenderingContext2D,
  code: MrtStationCodeLayout,
) {
  const { fontSize, horizontalScale, x, y } = getMrtStationCodeTextLayout(code);
  const fontScale = fontSize / MRT_STATION_CODE_FONT_METRICS.unitsPerEm;
  const layout = getStationCodeGlyphLayout(code);
  const baseline =
    y + (MRT_STATION_CODE_FONT_METRICS.capHeight * fontScale) / 2;

  context.save();
  context.translate(x, baseline);
  context.scale(horizontalScale * fontScale, -fontScale);
  context.translate(-layout.width / 2, 0);
  context.fillStyle = code.colour.fg;
  for (const glyph of layout.glyphs) {
    context.save();
    context.translate(glyph.x, 0);
    context.fill(getPath(MRT_STATION_CODE_GLYPHS[glyph.character].path));
    context.restore();
  }
  context.restore();
}

function drawConnectorRails(
  context: CanvasRenderingContext2D,
  connector: Parameters<typeof getMrtStationPartConnectorGeometry>[0],
) {
  const { connectorWidth, railBottom, railTop, x } =
    getMrtStationPartConnectorGeometry(connector);
  context.fillStyle = '#ffffff';
  context.fillRect(x, railTop, connectorWidth, MRT_STATION_BADGE_BORDER);
  context.fillRect(x, railBottom, connectorWidth, MRT_STATION_BADGE_BORDER);
}

function drawConnectorFill(
  context: CanvasRenderingContext2D,
  connector: Parameters<typeof getMrtStationPartConnectorGeometry>[0],
) {
  const {
    connectorBottom,
    connectorHalfWidth,
    connectorTop,
    leftClipBottom,
    rightClipTop,
    rightConnectorLeft,
    x,
  } = getMrtStationPartConnectorGeometry(connector);

  context.fillStyle = connector.leftColour;
  context.beginPath();
  context.moveTo(x, connectorTop);
  context.lineTo(x + connectorHalfWidth, connectorTop);
  context.lineTo(
    x + (leftClipBottom / 100) * connectorHalfWidth,
    connectorBottom,
  );
  context.lineTo(x, connectorBottom);
  context.closePath();
  context.fill();

  context.fillStyle = connector.rightColour;
  context.beginPath();
  context.moveTo(
    x + rightConnectorLeft + (rightClipTop / 100) * connectorHalfWidth,
    connectorTop,
  );
  context.lineTo(x + rightConnectorLeft + connectorHalfWidth, connectorTop);
  context.lineTo(x + rightConnectorLeft + connectorHalfWidth, connectorBottom);
  context.lineTo(x + rightConnectorLeft, connectorBottom);
  context.closePath();
  context.fill();
}

export function renderMrtStationBadge(badgeCode: string) {
  const layout = getMrtStationBadgeLayout(badgeCode);
  if (!layout) throw new Error(`Invalid MRT station badge code: ${badgeCode}`);

  const width = Math.ceil(layout.width);
  const canvas = getScratchCanvas();
  canvas.width = width;
  canvas.height = MRT_STATION_BADGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create MRT station badge canvas');

  context.translate((width - layout.width) / 2, 0);

  // The paint order matches the reusable SVG badge: rails under pills,
  // connector fills over their borders, and code glyphs always on top.
  for (const connector of layout.connectors) {
    drawConnectorRails(context, connector);
  }
  for (const part of layout.parts) {
    for (const code of part.codes) drawStationCodeShape(context, code);
    for (const [index, code] of part.codes.entries()) {
      const nextCode = part.codes.at(index + 1);
      if (!nextCode || code.colour.bg !== nextCode.colour.bg) continue;
      context.fillStyle = '#ffffff';
      context.fillRect(
        code.x + code.width,
        0,
        MRT_STATION_CODE_SEPARATOR_WIDTH,
        MRT_STATION_BADGE_HEIGHT,
      );
    }
  }
  for (const connector of layout.connectors) {
    drawConnectorFill(context, connector);
  }
  for (const part of layout.parts) {
    for (const code of part.codes) drawStationCodeText(context, code);
  }

  return context.getImageData(0, 0, width, MRT_STATION_BADGE_HEIGHT);
}
