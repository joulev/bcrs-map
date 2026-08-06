import { getMrtBadgeColourForPrefix } from './mrt-badge-colours';

interface MrtStationCode {
  lineCode: string;
  number: string;
  colour: ReturnType<typeof getMrtBadgeColourForPrefix>;
}

type MrtStationCodePart = MrtStationCode[];
type MrtStation = MrtStationCodePart[];

export type MrtStationCodePosition = 'left' | 'right' | 'middle' | 'single';

interface MrtStationCodeViewBox {
  height: number;
  minX: number;
  minY: number;
  width: number;
}

export interface MrtStationCodeLayout extends MrtStationCode {
  key: string;
  position: MrtStationCodePosition;
  viewBox: MrtStationCodeViewBox;
  width: number;
  x: number;
}

export interface MrtStationPartLayout {
  key: string;
  codes: MrtStationCodeLayout[];
  width: number;
  x: number;
}

export interface MrtStationPartConnector {
  key: string;
  leftColour: string;
  rightColour: string;
  x: number;
}

export interface MrtStationBadgeLayout {
  connectors: MrtStationPartConnector[];
  parts: MrtStationPartLayout[];
  width: number;
}

export const MRT_STATION_BADGE_BORDER = 2;
export const MRT_STATION_BADGE_HEIGHT = 54;
export const MRT_STATION_CODE_SEPARATOR_WIDTH = 3;

const CODE_HEIGHT = 50;
const CODE_GAP = 4;
const CODE_BADGE_END_FIX = 2;
const FONT_SIZE = 30;
const FONT_SIZE_SM = 24;
const FONT_HORIZONTAL_SCALE = 0.95;
const PART_GAP = 24;
const PART_CONNECTOR_WIDTH_OFFSET = 0.5;
const PART_CONNECTOR_HEIGHT = 11;
const PART_CONNECTOR_DX = 2;
const CODE_SVG_WIDTH = 223;
const CODE_SVG_HEIGHT = 126;
export const MRT_STATION_CODE_BORDER_STROKE_WIDTH =
  (MRT_STATION_BADGE_BORDER * 2 * CODE_SVG_HEIGHT) / CODE_HEIGHT;
const CODE_BORDER_OUTSET = MRT_STATION_CODE_BORDER_STROKE_WIDTH / 2;

function parseMrtStationBadge(badgeCode: string): MrtStation {
  return badgeCode
    .trim()
    .split('-')
    .map((connectedPart) =>
      connectedPart
        .split(':')
        .map((code): MrtStationCode | null => {
          const match = /^([A-Z]+)(\d*[A-Z]?)$/.exec(code.trim());
          if (!match) return null;
          const lineCode = match[1]!;
          const colour = getMrtBadgeColourForPrefix(lineCode);
          return { lineCode, number: match[2]!, colour };
        })
        .filter((code): code is MrtStationCode => Boolean(code)),
    )
    .filter((part) => part.length > 0);
}

function getStationCodePosition(index: number, length: number) {
  if (index === 0 && index === length - 1) return 'single';
  if (index === 0) return 'left';
  if (index === length - 1) return 'right';
  return 'middle';
}

export function getMrtStationCodeFillPath(position: MrtStationCodePosition) {
  switch (position) {
    case 'left':
      return 'M223 126H34.825c-13.992 0-21.925-13.52-24.028-17.671C3.636 94.191 0 78.945 0 63s3.636-31.2 10.797-45.34C12.9 13.52 20.843 0 34.825 0H223v126';
    case 'right':
      return 'M0 0h188.177c13.981 0 21.923 13.52 24.027 17.66C219.364 31.8 223 47.056 223 63s-3.636 31.2-10.796 45.329C210.1 112.47 202.168 126 188.177 126H0z';
    case 'single':
      return 'M212.204 17.66C210.1 13.52 202.158 0 188.177 0H34.823C20.842 0 12.9 13.52 10.797 17.66 3.636 31.8 0 47.056 0 63s3.636 31.2 10.797 45.329C12.9 112.47 20.832 126 34.823 126h153.354c13.991 0 21.923-13.52 24.027-17.671C219.364 94.191 223 78.945 223 63s-3.636-31.2-10.796-45.34';
    case 'middle':
      return 'M0 63V0h223v126H0z';
  }
}

export function getMrtStationCodeBorderPath(position: MrtStationCodePosition) {
  switch (position) {
    case 'left':
      return 'M223 0H34.825c-13.992 0-21.925 13.52-24.028 17.671C3.636 31.809 0 47.055 0 63s3.636 31.2 10.797 45.329C12.9 112.48 20.833 126 34.825 126H223';
    case 'right':
      return 'M0 0h188.177c13.981 0 21.923 13.52 24.027 17.66C219.364 31.8 223 47.056 223 63s-3.636 31.2-10.796 45.329C210.1 112.47 202.168 126 188.177 126H0';
    case 'single':
      return getMrtStationCodeFillPath(position);
    case 'middle':
      return 'M0 0H223M0 126H223';
  }
}

function getStationCodeViewBox(
  position: MrtStationCodePosition,
): MrtStationCodeViewBox {
  const height = CODE_SVG_HEIGHT + MRT_STATION_CODE_BORDER_STROKE_WIDTH;
  const minY = -CODE_BORDER_OUTSET;

  switch (position) {
    case 'left':
      return {
        height,
        minX: -CODE_BORDER_OUTSET,
        minY,
        width: CODE_SVG_WIDTH + CODE_BORDER_OUTSET,
      };
    case 'right':
      return {
        height,
        minX: 0,
        minY,
        width: CODE_SVG_WIDTH + CODE_BORDER_OUTSET,
      };
    case 'single':
      return {
        height,
        minX: -CODE_BORDER_OUTSET,
        minY,
        width: CODE_SVG_WIDTH + MRT_STATION_CODE_BORDER_STROKE_WIDTH,
      };
    case 'middle':
      return {
        height,
        minX: 0,
        minY,
        width: CODE_SVG_WIDTH,
      };
  }
}

function getStationCodeRenderWidth(viewBox: MrtStationCodeViewBox) {
  return (viewBox.width / viewBox.height) * MRT_STATION_BADGE_HEIGHT;
}

export function getMrtStationBadgeLayout(
  badgeCode: string,
): MrtStationBadgeLayout | null {
  const station = parseMrtStationBadge(badgeCode);
  if (station.length === 0) return null;

  const parts: MrtStationPartLayout[] = [];
  const connectors: MrtStationPartConnector[] = [];
  let cursor = 0;

  station.forEach((part, partIndex) => {
    const partX = cursor;
    let codeCursor = partX;
    const codes = part.map((code, codeIndex) => {
      const position = getStationCodePosition(codeIndex, part.length);
      const viewBox = getStationCodeViewBox(position);
      const width = getStationCodeRenderWidth(viewBox);
      const renderedCode: MrtStationCodeLayout = {
        ...code,
        key: `${partIndex}-${code.lineCode}${code.number}-${codeIndex}`,
        position,
        viewBox,
        width,
        x: codeCursor,
      };
      const nextCode = part.at(codeIndex + 1);
      const separatorWidth =
        nextCode && code.colour.bg === nextCode.colour.bg
          ? MRT_STATION_CODE_SEPARATOR_WIDTH
          : 0;
      codeCursor += width + separatorWidth;
      return renderedCode;
    });
    const width = codeCursor - partX;

    parts.push({
      key: `${partIndex}-${part.map((code) => `${code.lineCode}${code.number}`).join(':')}`,
      codes,
      width,
      x: partX,
    });

    cursor = codeCursor;

    const nextPart = station.at(partIndex + 1);
    if (nextPart) {
      connectors.push({
        key: `${partIndex}-${partIndex + 1}`,
        leftColour: part[part.length - 1]!.colour.bg,
        rightColour: nextPart[0]!.colour.bg,
        x: cursor,
      });
      cursor += PART_GAP;
    }
  });

  return { connectors, parts, width: cursor };
}

export function getMrtStationPartConnectorGeometry(
  connector: MrtStationPartConnector,
) {
  const connectorWidth =
    PART_GAP + MRT_STATION_BADGE_BORDER * 2 + PART_CONNECTOR_WIDTH_OFFSET * 2;
  const connectorOverhang =
    MRT_STATION_BADGE_BORDER + PART_CONNECTOR_WIDTH_OFFSET;
  const connectorHalfWidth = connectorWidth / 2 + PART_CONNECTOR_DX;
  const connectorTop =
    MRT_STATION_BADGE_BORDER + CODE_HEIGHT / 2 - PART_CONNECTOR_HEIGHT / 2;
  const connectorBottom = connectorTop + PART_CONNECTOR_HEIGHT;
  const railTop =
    MRT_STATION_BADGE_BORDER +
    CODE_HEIGHT / 2 -
    (PART_CONNECTOR_HEIGHT + MRT_STATION_BADGE_BORDER * 2) / 2;
  const railBottom =
    CODE_HEIGHT / 2 +
    (PART_CONNECTOR_HEIGHT + MRT_STATION_BADGE_BORDER * 2) / 2;
  const rightConnectorLeft =
    connectorOverhang + PART_GAP / 2 - PART_CONNECTOR_DX;
  const leftClipBottom =
    ((connectorWidth / 2 - PART_CONNECTOR_DX) / connectorHalfWidth) * 100;
  const rightClipTop = ((PART_CONNECTOR_DX * 2) / connectorHalfWidth) * 100;
  const x = connector.x - connectorOverhang;

  return {
    connectorHalfWidth,
    connectorBottom,
    connectorTop,
    connectorWidth,
    leftClipBottom,
    railBottom,
    railTop,
    rightClipTop,
    rightConnectorLeft,
    x,
  };
}

export function getMrtStationCodeTransform(code: MrtStationCodeLayout) {
  const scale = MRT_STATION_BADGE_HEIGHT / code.viewBox.height;
  return {
    scale,
    svg: `translate(${code.x} 0) scale(${scale}) translate(${-code.viewBox.minX} ${-code.viewBox.minY})`,
  };
}

export function getMrtStationCodeTextLayout(code: MrtStationCodeLayout) {
  const label = `${code.lineCode}${code.number}`;
  const fontSize = label.length > 4 ? FONT_SIZE_SM : FONT_SIZE;
  const xOffset =
    code.position === 'left' && code.lineCode.includes('W')
      ? CODE_BADGE_END_FIX
      : code.position === 'right' && code.lineCode.includes('W')
        ? -CODE_BADGE_END_FIX
        : 0;

  return {
    fontSize,
    gapBeforeIndex: code.number ? code.lineCode.length : null,
    gapWidth: CODE_GAP,
    horizontalScale: FONT_HORIZONTAL_SCALE,
    label,
    x: code.x + code.width / 2 + xOffset,
    y: MRT_STATION_BADGE_HEIGHT / 2,
  };
}
