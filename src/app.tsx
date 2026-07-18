import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useState, useSyncExternalStore } from "react";
import {
  GeolocateControl,
  Map,
  NavigationControl,
  type MapLayerMouseEvent,
  type ViewState,
} from "react-map-gl/maplibre";
import "./index.css";
import { MrtMap } from "./mrt-map";
import {
  INTERACTIVE_LAYERS,
  LocationPopup,
  ReturnPointsLegend,
  type ReturnPointProperties,
  type SelectedLocation,
  ReturnPointsLayer,
} from "./return-points";

const INITIAL_VIEW_STATE: ViewState = {
  longitude: 103.8198,
  latitude: 1.3521,
  zoom: 10.6,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemDarkMode(onChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getSystemDarkMode() {
  return window.matchMedia(DARK_MODE_QUERY).matches;
}

function useSystemDarkMode() {
  return useSyncExternalStore(
    subscribeToSystemDarkMode,
    getSystemDarkMode,
    () => false,
  );
}

export function App() {
  const isDarkMode = useSystemDarkMode();
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [isHoveringLocation, setIsHoveringLocation] = useState(false);

  const selectLocation = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") {
      setSelectedLocation(null);
      return;
    }

    const [longitude, latitude] = feature.geometry.coordinates;
    if (longitude === undefined || latitude === undefined) return;

    setSelectedLocation({
      ...(feature.properties as ReturnPointProperties),
      longitude,
      latitude,
    });
  }, []);

  return (
    <main className="relative h-full w-full bg-neutral-200 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={`https://tiles.openfreemap.org/styles/${isDarkMode ? "dark" : "positron"}`}
        minZoom={9}
        maxZoom={19}
        interactiveLayerIds={INTERACTIVE_LAYERS}
        cursor={isHoveringLocation ? "pointer" : "grab"}
        onMouseEnter={() => setIsHoveringLocation(true)}
        onMouseLeave={() => setIsHoveringLocation(false)}
        onClick={selectLocation}
        reuseMaps
      >
        <MrtMap darkMode={isDarkMode} />

        <ReturnPointsLayer darkMode={isDarkMode} />

        {selectedLocation && (
          <LocationPopup
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
          />
        )}

        <GeolocateControl
          position="bottom-right"
          positionOptions={{
            enableHighAccuracy: false,
            timeout: 30_000,
            maximumAge: 30_000,
          }}
          trackUserLocation={false}
        />
        <NavigationControl position="bottom-right" showCompass={false} />
      </Map>

      <ReturnPointsLegend />
    </main>
  );
}

export default App;
