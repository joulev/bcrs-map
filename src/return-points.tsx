import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Point } from "geojson";
import type { CircleLayerSpecification } from "maplibre-gl";
import { useState, type ReactNode } from "react";
import { Layer, Popup, Source } from "react-map-gl/maplibre";

type BcrsLocation = {
  id: number;
  locationName: string | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  postalCode: string | null;
  status: string;
  rvmOpeningHours: string | null;
};

export type ReturnPointProperties = Pick<
  BcrsLocation,
  | "id"
  | "locationName"
  | "address"
  | "postalCode"
  | "status"
  | "rvmOpeningHours"
>;

export type SelectedLocation = ReturnPointProperties & {
  latitude: number;
  longitude: number;
};
export const LOCATION_LAYER: CircleLayerSpecification = {
  id: "locations",
  type: "circle",
  source: "locations",
  paint: {
    "circle-color": [
      "case",
      ["==", ["get", "status"], "RUNNING"],
      "#4d7c0f",
      "#a1a1a1",
    ],
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      9,
      3.5,
      13,
      5.5,
      16,
      8,
    ],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 1.75,
  },
};

export const INTERACTIVE_LAYERS = [LOCATION_LAYER.id];

export function useReturnPoints() {
  const query = useQuery({
    queryKey: ["return-points"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      if (!response.ok)
        throw new Error(`Location request failed (${response.status})`);

      const result = (await response.json()) as {
        status: string;
        data: BcrsLocation[];
      };
      if (result.status !== "ok" || !Array.isArray(result.data)) {
        throw new Error(
          "The locations service returned an unexpected response",
        );
      }

      return result.data;
    },
    select: (locations): FeatureCollection<Point, ReturnPointProperties> => ({
      type: "FeatureCollection",
      features: locations.flatMap((location) => {
        if (!location.latitude?.trim() || !location.longitude?.trim())
          return [];

        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return [];
        }

        return [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [longitude, latitude],
            },
            properties: {
              id: location.id,
              locationName: location.locationName,
              address: location.address,
              postalCode: location.postalCode,
              status: location.status,
              rvmOpeningHours: location.rvmOpeningHours,
            },
          },
        ];
      }),
    }),
  });

  return {
    ...query,
    data: query.data ?? {
      type: "FeatureCollection" as const,
      features: [],
    },
  };
}

export function ReturnPointsLayer({ darkMode }: { darkMode: boolean }) {
  const returnPointsQuery = useReturnPoints();
  return (
    <Source id="locations" type="geojson" data={returnPointsQuery.data}>
      <Layer
        {...LOCATION_LAYER}
        paint={{
          ...LOCATION_LAYER.paint,
          "circle-stroke-color": darkMode ? "#000000" : "#ffffff",
        }}
      />
    </Source>
  );
}

export function LocationPopup({
  location,
  onClose,
}: {
  location: SelectedLocation;
  onClose: () => void;
}) {
  return (
    <Popup
      longitude={location.longitude}
      latitude={location.latitude}
      maxWidth="288px"
      offset={12}
      closeButton={false}
      closeOnClick
      className="font-sans [&_.maplibregl-popup-content]:rounded-2xl! [&_.maplibregl-popup-content]:bg-neutral-50! [&_.maplibregl-popup-content]:border [&_.maplibregl-popup-content]:border-neutral-200 [&_.maplibregl-popup-content]:p-0! [&_.maplibregl-popup-content]:shadow-lg! [&_.maplibregl-popup-tip]:hidden dark:[&_.maplibregl-popup-content]:bg-neutral-900! dark:[&_.maplibregl-popup-content]:border-neutral-800"
      onClose={onClose}
    >
      <article className="flex flex-col p-4">
        <span
          className={`mb-3 inline-flex self-start rounded-md px-2 bg-current/10 ${
            location.status === "RUNNING"
              ? "text-lime-700 dark:text-lime-400"
              : "capitalize"
          }`}
        >
          {location.status === "RUNNING"
            ? "In service"
            : `Status: ${location.status.toLowerCase()}`}
        </span>
        <h2 className="mb-1 leading-tight text-balance text-base font-semibold">
          {location.locationName || "BCRS return point"}
        </h2>
        <p className="text-sm tracking-tight text-neutral-500 dark:text-neutral-400">
          {location.address || "Address unavailable"}
        </p>
        {location.rvmOpeningHours && (
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            {location.rvmOpeningHours}
          </p>
        )}
      </article>
    </Popup>
  );
}

function LoaderIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function XIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function InfoIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function LegendRow({
  className,
  colourClass,
  children,
}: {
  className?: string;
  colourClass: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-row items-center gap-3 ${className}`}>
      <div className={`size-4 rounded-full ${colourClass}`} />
      <div>{children}</div>
    </div>
  );
}

export function ReturnPointsLegend() {
  const query = useReturnPoints();
  const [isDisplayed, setIsDisplayed] = useState(false);

  if (!isDisplayed)
    return (
      <button
        className="sm:hidden absolute top-3 right-3 font-medium rounded-2xl flex flex-row items-center gap-2 px-3 py-2 text-xs border border-neutral-200 bg-neutral-50 shadow-md dark:bg-neutral-900 dark:shadow-black/40 dark:border-neutral-800 active:scale-95"
        onClick={() => setIsDisplayed(true)}
      >
        <InfoIcon className="size-4" />
        View legend
      </button>
    );

  return (
    <header className="absolute max-sm:top-3 max-sm:inset-x-3 sm:bottom-3 sm:left-3 sm:w-72 z-10 flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm shadow-lg dark:bg-neutral-900 dark:shadow-black/40 dark:border-neutral-800">
      {query.isError ? (
        <div className="flex flex-col gap-3 text-center">
          <p>Could not get locations from BCRS</p>
          <button className="rounded-lg font-medium bg-lime-700 px-3 py-1 text-white hover:bg-lime-800 active:scale-98 dark:bg-lime-600 dark:hover:bg-lime-500">
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 relative">
          <LegendRow colourClass="bg-lime-700">
            BCRS Return Points
            {query.isLoading ? (
              <LoaderIcon className="mb-0.5 ml-2 inline size-4 animate-spin text-neutral-500 dark:text-neutral-400" />
            ) : null}
            {query.isSuccess ? (
              <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">
                ({query.data.features.length.toLocaleString()})
              </span>
            ) : null}
          </LegendRow>
          <LegendRow colourClass="bg-neutral-400">
            Inactive Return Points
          </LegendRow>
          <button
            className="absolute top-0 right-0 text-xs text-neutral-500 dark:text-neutral-400 sm:hidden active:scale-95"
            onClick={() => setIsDisplayed(false)}
          >
            <XIcon className="size-5" aria-label="Close legend" />
          </button>
        </div>
      )}
      <div className="text-xs text-neutral-500 dark:text-neutral-400 [&_a]:underline">
        Data from <a href="https://returnright.sg">BCRS</a>. MRT data from{" "}
        <a href="https://github.com/cheeaun/sgraildata">cheeaun</a>.
        <br />
        Built with GPT 5.6-Sol by{" "}
        <a href="https://github.com/joulev/bcrs-map">joulev</a>.
      </div>
    </header>
  );
}
