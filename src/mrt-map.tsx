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
  SymbolLayerSpecification,
} from "maplibre-gl";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
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
  name: string;
  network: string;
  station_codes: string;
  colour: string;
};

type RawStationProperties = Omit<MrtStationProperties, "colour">;
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

const MRT_STATIONS: FeatureCollection<Point, MrtStationProperties> = {
  type: "FeatureCollection",
  features: rawMrtStations.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
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

export function MrtMap({
  darkMode,
  zoom,
}: {
  darkMode: boolean;
  zoom: number;
}) {
  const badgeSize = zoom >= 17 ? "h-5" : "h-4";

  return (
    <>
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
      {zoom >= 14 &&
        MRT_STATIONS.features.map((station) => (
          <Marker
            key={
              station.id ??
              `${station.properties.name}-${station.properties.station_codes}`
            }
            longitude={station.geometry.coordinates[0]!}
            latitude={station.geometry.coordinates[1]!}
            anchor="center"
            style={{ pointerEvents: "none" }}
          >
            <MrtStationBadgeImage
              badgeCode={station.properties.station_codes}
              label={`${station.properties.name} station ${station.properties.station_codes}`}
              className={`${badgeSize} drop-shadow-sm`}
            />
          </Marker>
        ))}
    </>
  );
}
