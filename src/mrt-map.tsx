import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
} from "geojson";
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  MapStyleImageMissingEvent,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { useEffect } from "react";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { Layer, Source, useMap } from "react-map-gl/maplibre";
import notoSansFontUrl from "../node_modules/@fontsource-variable/noto-sans/files/noto-sans-latin-wght-normal.woff2";
import mrtData from "./data/sg-rail.geo.json";
import {
  getMrtBadgeBackgroundForPrefix,
  MrtStationBadgeImage,
} from "./mrt-station-badge";

type MrtLineProperties = {
  name: string;
  network: string;
  line_color: string;
};

type MrtStationProperties = {
  badgeImageId: string;
  name: string;
  network: string;
  station_codes: string;
  colour: string;
};

type RawStationProperties = Omit<
  MrtStationProperties,
  "badgeImageId" | "colour"
>;
type MrtFeature =
  | Feature<Point, RawStationProperties>
  | Feature<LineString | MultiLineString, MrtLineProperties>;

const rawMrtData = mrtData as unknown as FeatureCollection<
  Point | LineString | MultiLineString,
  RawStationProperties | MrtLineProperties
>;

const rawMrtStations = rawMrtData.features.filter(
  (feature) => feature.geometry.type === "Point",
) as Feature<Point, RawStationProperties>[];

const MRT_BADGE_IMAGE_PREFIX = "mrt-station-badge:";
const MRT_BADGE_HEIGHT = 54;

function getMrtBadgeFontStyle(fontDataUrl: string) {
  return `<style>@font-face{font-family:"Noto Sans";font-style:normal;font-weight:100 900;src:url("${fontDataUrl}") format("woff2")}text{font-family:"Noto Sans",sans-serif}</style>`;
}

function getMrtBadgeImageId(badgeCode: string) {
  return `${MRT_BADGE_IMAGE_PREFIX}${badgeCode}`;
}

const MRT_STATIONS: FeatureCollection<Point, MrtStationProperties> = {
  type: "FeatureCollection",
  features: rawMrtStations.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      badgeImageId: getMrtBadgeImageId(feature.properties.station_codes),
      colour: getMrtBadgeBackgroundForPrefix(
        feature.properties.station_codes.match(/^[A-Z]+/)?.[0] ?? "",
      ),
    },
  })),
};

const MRT_LINES: FeatureCollection<
  LineString | MultiLineString,
  MrtLineProperties
> = {
  type: "FeatureCollection",
  features: rawMrtData.features.filter(
    (feature) => feature.geometry.type !== "Point",
  ) as Extract<
    MrtFeature,
    Feature<LineString | MultiLineString, MrtLineProperties>
  >[],
};

const MRT_LINE_CASING: LineLayerSpecification = {
  id: "mrt-line-casing",
  type: "line",
  source: "mrt-lines",
  minzoom: 9,
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": "#ffffff",
    "line-opacity": 0.9,
    "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 5.5, 18, 9],
  },
};

const MRT_LINE: LineLayerSpecification = {
  id: "mrt-lines",
  type: "line",
  source: "mrt-lines",
  minzoom: 9,
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": ["get", "line_color"],
    "line-opacity": 0.92,
    "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.25, 14, 3, 18, 5],
  },
};

const MRT_STATION_DOTS: CircleLayerSpecification = {
  id: "mrt-station-dots",
  type: "circle",
  source: "mrt-stations",
  minzoom: 10,
  maxzoom: 14,
  paint: {
    "circle-color": ["get", "colour"],
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 3.5],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      0.75,
      14,
      1.5,
    ],
  },
};

const MRT_STATION_BADGES: SymbolLayerSpecification = {
  id: "mrt-station-badges",
  type: "symbol",
  source: "mrt-stations",
  minzoom: 14,
  layout: {
    "icon-image": ["get", "badgeImageId"],
    "icon-size": [
      "step",
      ["zoom"],
      16 / MRT_BADGE_HEIGHT,
      17,
      20 / MRT_BADGE_HEIGHT,
    ],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

const MRT_STATION_NAMES: SymbolLayerSpecification = {
  id: "mrt-station-names",
  type: "symbol",
  source: "mrt-stations",
  minzoom: 14,
  layout: {
    "text-field": ["get", "name"],
    "text-font": ["Noto Sans Bold"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 14, 11, 16, 13],
    "text-anchor": "top",
    "text-offset": [0, 1.1],
    "text-padding": 3,
    "text-optional": true,
  },
  paint: {
    "text-color": "#000000",
    "text-halo-color": "rgba(255, 255, 255, 0.96)",
    "text-halo-width": 1.5,
  },
};

const badgeImages = new Map<string, Promise<HTMLImageElement>>();
let notoSansFontDataUrl: Promise<string> | undefined;

function loadNotoSansFontDataUrl() {
  notoSansFontDataUrl ??= fetch(notoSansFontUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load Noto Sans (${response.status})`);
      }
      return response.blob();
    })
    .then(
      (font) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(font);
        }),
    );

  return notoSansFontDataUrl;
}

function loadMrtBadgeImage(badgeCode: string) {
  const existingImage = badgeImages.get(badgeCode);
  if (existingImage) return existingImage;

  const imagePromise = loadNotoSansFontDataUrl().then(
    (fontDataUrl) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const svg = renderToStaticMarkup(
          <MrtStationBadgeImage badgeCode={badgeCode} />,
        )
          .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
          .replace(">", `>${getMrtBadgeFontStyle(fontDataUrl)}`);
        image.onload = () => resolve(image);
        image.onerror = () =>
          reject(new Error(`Failed to render MRT badge ${badgeCode}`));
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      }),
  );

  badgeImages.set(badgeCode, imagePromise);
  return imagePromise;
}

function MrtBadgeImages() {
  const { current: mapRef } = useMap();

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    let cancelled = false;
    const pendingImageIds = new Set<string>();

    const addMissingBadgeImage = (event: MapStyleImageMissingEvent) => {
      if (!event.id.startsWith(MRT_BADGE_IMAGE_PREFIX)) return;
      if (map.hasImage(event.id) || pendingImageIds.has(event.id)) return;

      const badgeCode = event.id.slice(MRT_BADGE_IMAGE_PREFIX.length);
      pendingImageIds.add(event.id);
      void loadMrtBadgeImage(badgeCode)
        .then((image) => {
          if (!cancelled && !map.hasImage(event.id)) {
            map.addImage(event.id, image);
          }
        })
        .catch((error: unknown) => console.error(error))
        .finally(() => pendingImageIds.delete(event.id));
    };

    map.on("styleimagemissing", addMissingBadgeImage);
    return () => {
      cancelled = true;
      map.off("styleimagemissing", addMissingBadgeImage);
    };
  }, [mapRef]);

  return null;
}

export function MrtMap({ darkMode }: { darkMode: boolean }) {
  return (
    <>
      <MrtBadgeImages />
      <Source id="mrt-lines" type="geojson" data={MRT_LINES}>
        <Layer
          {...MRT_LINE_CASING}
          paint={{
            ...MRT_LINE_CASING.paint,
            "line-color": darkMode ? "#171717" : "#ffffff",
          }}
        />
        <Layer {...MRT_LINE} />
      </Source>
      <Source id="mrt-stations" type="geojson" data={MRT_STATIONS}>
        <Layer
          {...MRT_STATION_DOTS}
          paint={{
            ...MRT_STATION_DOTS.paint,
            "circle-stroke-color": darkMode ? "#171717" : "#ffffff",
          }}
        />
        <Layer {...MRT_STATION_BADGES} />
        <Layer
          {...MRT_STATION_NAMES}
          paint={{
            ...MRT_STATION_NAMES.paint,
            "text-color": darkMode ? "#fafafa" : "#000000",
            "text-halo-color": darkMode
              ? "rgba(23, 23, 23, 0.96)"
              : "rgba(255, 255, 255, 0.96)",
          }}
        />
      </Source>
    </>
  );
}
