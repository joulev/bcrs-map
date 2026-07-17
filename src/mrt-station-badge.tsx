interface MrtBadgeColour {
  fg: string;
  bg: string;
}

const MRT_BADGE_DEFAULT_COLOUR = {
  bg: "#718472",
  fg: "white",
} satisfies MrtBadgeColour;

const MRT_BADGE_COLOURS_BY_PREFIX: Readonly<Record<string, MrtBadgeColour>> = {
  NS: { bg: "#E1251B", fg: "white" },
  EW: { bg: "#00953B", fg: "white" },
  CG: { bg: "#00953B", fg: "white" },
  NE: { bg: "#9E28B5", fg: "white" },
  CC: { bg: "#FF9E18", fg: "#231F20" },
  CE: { bg: "#FF9E18", fg: "#231F20" },
  DE: { bg: "#005DA6", fg: "white" },
  DT: { bg: "#005DA6", fg: "white" },
  TE: { bg: "#9D5918", fg: "white" },
  JR: { bg: "#00B0BE", fg: "white" },
  JS: { bg: "#00B0BE", fg: "white" },
  JW: { bg: "#00B0BE", fg: "white" },
  JE: { bg: "#00B0BE", fg: "white" },
  CR: { bg: "#94C83D", fg: "#2C2925" },
  CP: { bg: "#94C83D", fg: "#2C2925" },
};

function getMrtBadgeColourForPrefix(lineCode: string): MrtBadgeColour {
  return (
    MRT_BADGE_COLOURS_BY_PREFIX[lineCode] ??
    (lineCode.endsWith("L")
      ? MRT_BADGE_COLOURS_BY_PREFIX[lineCode.slice(0, -1)]
      : undefined) ??
    MRT_BADGE_DEFAULT_COLOUR
  );
}

export function getMrtBadgeBackgroundForPrefix(lineCode: string) {
  return getMrtBadgeColourForPrefix(lineCode).bg;
}

interface StationCode {
  lineCode: string;
  number: string;
  colour: ReturnType<typeof getMrtBadgeColourForPrefix>;
}

type StationCodePart = StationCode[];
type Station = StationCodePart[];
type StationCodePosition = "left" | "right" | "middle" | "single";

interface RenderedStationCode extends StationCode {
  key: string;
  position: StationCodePosition;
  viewBox: StationCodeViewBox;
  width: number;
  x: number;
}

interface RenderedStationPart {
  key: string;
  codes: RenderedStationCode[];
  width: number;
  x: number;
}

interface StationPartConnector {
  key: string;
  leftColour: string;
  rightColour: string;
  x: number;
}

interface StationLayout {
  connectors: StationPartConnector[];
  parts: RenderedStationPart[];
  width: number;
}

interface StationCodeViewBox {
  height: number;
  minX: number;
  minY: number;
  width: number;
}

interface MrtStationBadgeImageProps {
  badgeCode: string;
  label?: string;
  className?: string;
}

const BORDER = 2;
const CODE_HEIGHT = 50;
const CODE_GAP = 4;
const CODE_BADGE_END_FIX = 2;
const FONT_SIZE = 30;
const FONT_SIZE_SM = 24;
const CODE_SEPARATOR_WIDTH = 3;
const PART_GAP = 24;
const PART_CONNECTOR_WIDTH_OFFSET = 0.5;
const PART_CONNECTOR_HEIGHT = 11;
const PART_CONNECTOR_DX = 2;
const TOTAL_HEIGHT = CODE_HEIGHT + BORDER * 2;
const CODE_SVG_WIDTH = 223;
const CODE_SVG_HEIGHT = 126;
const CODE_BORDER_STROKE_WIDTH = (BORDER * 2 * CODE_SVG_HEIGHT) / CODE_HEIGHT;
const CODE_BORDER_OUTSET = CODE_BORDER_STROKE_WIDTH / 2;

function getStationDetails(station: string): Station {
  return station
    .trim()
    .split("-")
    .map((connectedPart) =>
      connectedPart
        .split(":")
        .map((code): StationCode | null => {
          const match = /^([A-Z]+)(\d*[A-Z]?)$/.exec(code.trim());
          if (!match) return null;
          const lineCode = match[1]!;
          const colour = getMrtBadgeColourForPrefix(lineCode);
          return { lineCode, number: match[2]!, colour };
        })
        .filter((code): code is StationCode => Boolean(code)),
    )
    .filter((part) => part.length > 0);
}

function getStationCodePosition(index: number, length: number) {
  if (index === 0 && index === length - 1) return "single";
  if (index === 0) return "left";
  if (index === length - 1) return "right";
  return "middle";
}

function getStationCodeFillPath(position: StationCodePosition) {
  switch (position) {
    case "left":
      return "M223 126H34.825c-13.992 0-21.925-13.52-24.028-17.671C3.636 94.191 0 78.945 0 63s3.636-31.2 10.797-45.34C12.9 13.52 20.843 0 34.825 0H223v126";
    case "right":
      return "M0 0h188.177c13.981 0 21.923 13.52 24.027 17.66C219.364 31.8 223 47.056 223 63s-3.636 31.2-10.796 45.329C210.1 112.47 202.168 126 188.177 126H0z";
    case "single":
      return "M212.204 17.66C210.1 13.52 202.158 0 188.177 0H34.823C20.842 0 12.9 13.52 10.797 17.66 3.636 31.8 0 47.056 0 63s3.636 31.2 10.797 45.329C12.9 112.47 20.832 126 34.823 126h153.354c13.991 0 21.923-13.52 24.027-17.671C219.364 94.191 223 78.945 223 63s-3.636-31.2-10.796-45.34";
    case "middle":
      return "M0 63V0h223v126H0z";
  }
}

function getStationCodeBorderPath(position: StationCodePosition) {
  switch (position) {
    case "left":
      return "M223 0H34.825c-13.992 0-21.925 13.52-24.028 17.671C3.636 31.809 0 47.055 0 63s3.636 31.2 10.797 45.329C12.9 112.48 20.833 126 34.825 126H223";
    case "right":
      return "M0 0h188.177c13.981 0 21.923 13.52 24.027 17.66C219.364 31.8 223 47.056 223 63s-3.636 31.2-10.796 45.329C210.1 112.47 202.168 126 188.177 126H0";
    case "single":
      return getStationCodeFillPath(position);
    case "middle":
      return "M0 0H223M0 126H223";
  }
}

function getStationCodeViewBox(
  position: StationCodePosition,
): StationCodeViewBox {
  const height = CODE_SVG_HEIGHT + CODE_BORDER_STROKE_WIDTH;
  const minY = -CODE_BORDER_OUTSET;

  switch (position) {
    case "left":
      return {
        height,
        minX: -CODE_BORDER_OUTSET,
        minY,
        width: CODE_SVG_WIDTH + CODE_BORDER_OUTSET,
      };
    case "right":
      return {
        height,
        minX: 0,
        minY,
        width: CODE_SVG_WIDTH + CODE_BORDER_OUTSET,
      };
    case "single":
      return {
        height,
        minX: -CODE_BORDER_OUTSET,
        minY,
        width: CODE_SVG_WIDTH + CODE_BORDER_STROKE_WIDTH,
      };
    case "middle":
      return {
        height,
        minX: 0,
        minY,
        width: CODE_SVG_WIDTH,
      };
  }
}

function getStationCodeRenderWidth(viewBox: StationCodeViewBox) {
  return (viewBox.width / viewBox.height) * TOTAL_HEIGHT;
}

function getStationLayout(station: Station): StationLayout {
  const parts: RenderedStationPart[] = [];
  const connectors: StationPartConnector[] = [];
  let cursor = 0;

  station.forEach((part, partIndex) => {
    const partX = cursor;
    let codeCursor = partX;
    const codes = part.map((code, codeIndex) => {
      const position = getStationCodePosition(codeIndex, part.length);
      const viewBox = getStationCodeViewBox(position);
      const width = getStationCodeRenderWidth(viewBox);
      const renderedCode: RenderedStationCode = {
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
          ? CODE_SEPARATOR_WIDTH
          : 0;
      codeCursor += width + separatorWidth;
      return renderedCode;
    });
    const width = codeCursor - partX;

    parts.push({
      key: `${partIndex}-${part.map((code) => `${code.lineCode}${code.number}`).join(":")}`,
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

function getStationPartConnectorGeometry(connector: StationPartConnector) {
  const connectorWidth =
    PART_GAP + BORDER * 2 + PART_CONNECTOR_WIDTH_OFFSET * 2;
  const connectorOverhang = BORDER + PART_CONNECTOR_WIDTH_OFFSET;
  const connectorHalfWidth = connectorWidth / 2 + PART_CONNECTOR_DX;
  const connectorTop = BORDER + CODE_HEIGHT / 2 - PART_CONNECTOR_HEIGHT / 2;
  const railTop =
    BORDER + CODE_HEIGHT / 2 - (PART_CONNECTOR_HEIGHT + BORDER * 2) / 2;
  const railBottom = CODE_HEIGHT / 2 + (PART_CONNECTOR_HEIGHT + BORDER * 2) / 2;
  const rightConnectorLeft =
    connectorOverhang + PART_GAP / 2 - PART_CONNECTOR_DX;
  const leftClipBottom =
    ((connectorWidth / 2 - PART_CONNECTOR_DX) / connectorHalfWidth) * 100;
  const rightClipTop = ((PART_CONNECTOR_DX * 2) / connectorHalfWidth) * 100;
  const x = connector.x - connectorOverhang;

  return {
    connectorHalfWidth,
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

function StationPartConnectorRails({
  connector,
}: {
  connector: StationPartConnector;
}) {
  const { connectorWidth, railBottom, railTop, x } =
    getStationPartConnectorGeometry(connector);

  return (
    <g transform={`translate(${x} 0)`}>
      <rect
        fill="white"
        height={BORDER}
        width={connectorWidth}
        x="0"
        y={railTop}
      />
      <rect
        fill="white"
        height={BORDER}
        width={connectorWidth}
        x="0"
        y={railBottom}
      />
    </g>
  );
}

function StationPartConnectorFill({
  connector,
}: {
  connector: StationPartConnector;
}) {
  const {
    connectorHalfWidth,
    connectorTop,
    leftClipBottom,
    rightClipTop,
    rightConnectorLeft,
    x,
  } = getStationPartConnectorGeometry(connector);

  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d={`M0 ${connectorTop} H${connectorHalfWidth} L${(leftClipBottom / 100) * connectorHalfWidth} ${connectorTop + PART_CONNECTOR_HEIGHT} H0 Z`}
        fill={connector.leftColour}
      />
      <path
        d={`M${rightConnectorLeft + (rightClipTop / 100) * connectorHalfWidth} ${connectorTop} H${rightConnectorLeft + connectorHalfWidth} V${connectorTop + PART_CONNECTOR_HEIGHT} H${rightConnectorLeft} Z`}
        fill={connector.rightColour}
      />
    </g>
  );
}

function getStationCodeTransform(code: RenderedStationCode) {
  const scale = TOTAL_HEIGHT / code.viewBox.height;
  return `translate(${code.x} 0) scale(${scale}) translate(${-code.viewBox.minX} ${-code.viewBox.minY})`;
}

function StationCodeText({ code }: { code: RenderedStationCode }) {
  const fontSize =
    code.lineCode.length + code.number.length > 4 ? FONT_SIZE_SM : FONT_SIZE;
  const label = `${code.lineCode}${code.number}`;
  const dx = code.number
    ? Array.from({ length: label.length }, (_, index) =>
        index === code.lineCode.length ? CODE_GAP : 0,
      ).join(" ")
    : undefined;
  const xOffset =
    code.position === "left" && code.lineCode.includes("W")
      ? CODE_BADGE_END_FIX
      : code.position === "right" && code.lineCode.includes("W")
        ? -CODE_BADGE_END_FIX
        : 0;

  return (
    <text
      dominantBaseline="central"
      dx={dx}
      fill={code.colour.fg}
      fontFamily="Noto Sans"
      fontSize={fontSize}
      fontWeight={700}
      textAnchor="middle"
      transform={`translate(${code.x + code.width / 2 + xOffset} ${TOTAL_HEIGHT / 2}) scale(0.95 1)`}
      x="0"
      y="0"
    >
      {label}
    </text>
  );
}

function StationCodeShape({ code }: { code: RenderedStationCode }) {
  return (
    <g transform={getStationCodeTransform(code)}>
      <path
        d={getStationCodeBorderPath(code.position)}
        fill="none"
        stroke="white"
        strokeLinecap="butt"
        strokeLinejoin="round"
        strokeWidth={CODE_BORDER_STROKE_WIDTH}
      />
      <path
        d={getStationCodeFillPath(code.position)}
        fill={code.colour.bg}
        fillRule="evenodd"
      />
    </g>
  );
}

function StationPartShapes({ part }: { part: RenderedStationPart }) {
  return (
    <g>
      {part.codes.map((code) => (
        <StationCodeShape key={code.key} code={code} />
      ))}
      {part.codes.map((code, index) => {
        const nextCode = part.codes.at(index + 1);
        if (!nextCode || code.colour.bg !== nextCode.colour.bg) return null;
        return (
          <rect
            key={`${code.key}-separator`}
            fill="white"
            height={TOTAL_HEIGHT}
            width={CODE_SEPARATOR_WIDTH}
            x={code.x + code.width}
            y="0"
          />
        );
      })}
    </g>
  );
}

function StationPartText({ part }: { part: RenderedStationPart }) {
  return (
    <g>
      {part.codes.map((code) => (
        <StationCodeText key={`${code.key}-text`} code={code} />
      ))}
    </g>
  );
}

function StationBadge({
  station,
  label,
  className,
}: {
  station: Station;
  label?: string;
  className?: string;
}) {
  const layout = getStationLayout(station);

  return (
    <svg
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block w-auto max-w-none overflow-visible align-middle ${className ?? "h-6"}`}
      fill="none"
      focusable="false"
      height={TOTAL_HEIGHT}
      viewBox={`0 0 ${layout.width} ${TOTAL_HEIGHT}`}
      width={layout.width}
    >
      {/* Rails sit under the pills; connector fill returns above pill borders, then text wins last. */}
      {layout.connectors.map((connector) => (
        <StationPartConnectorRails
          key={`${connector.key}-rails`}
          connector={connector}
        />
      ))}
      {layout.parts.map((part) => (
        <StationPartShapes key={`${part.key}-shapes`} part={part} />
      ))}
      {layout.connectors.map((connector) => (
        <StationPartConnectorFill
          key={`${connector.key}-fill`}
          connector={connector}
        />
      ))}
      {layout.parts.map((part) => (
        <StationPartText key={`${part.key}-text`} part={part} />
      ))}
    </svg>
  );
}

export function MrtStationBadgeImage({
  badgeCode,
  label,
  className,
}: MrtStationBadgeImageProps) {
  if (badgeCode.length === 0) return null;

  const station = getStationDetails(badgeCode);
  if (station.length === 0) return null;

  return <StationBadge station={station} label={label} className={className} />;
}
