import { useEffect, useMemo } from "react";
import { FiMapPin } from "react-icons/fi";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";

const DEFAULT_CENTER = { lat: -25.7479, lng: 28.2293 };
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function SchoolLocationPicker(props) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="location-picker">
        <div className="map-message map-error">
          VITE_GOOGLE_MAPS_API_KEY is missing.
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      onLoad={() => {
        console.log("Maps API has loaded.", {
          apiKeyPresent: Boolean(GOOGLE_MAPS_API_KEY),
          apiKeyPreview: `${GOOGLE_MAPS_API_KEY.slice(0, 6)}...${GOOGLE_MAPS_API_KEY.slice(-4)}`,
        });
      }}
    >
      <GoogleLocationPicker {...props} />
    </APIProvider>
  );
}

function GoogleLocationPicker({ value, locked = false }) {
  const map = useMap();

  const selectedPosition = useMemo(
    () =>
      value.latitude !== null && value.longitude !== null
        ? { lat: Number(value.latitude), lng: Number(value.longitude) }
        : null,
    [value.latitude, value.longitude],
  );
  const center = selectedPosition || DEFAULT_CENTER;
  const locationSelected = locked || Boolean(selectedPosition);

  useEffect(() => {
    if (!map || !selectedPosition) return;
    map.panTo(selectedPosition);
    map.setZoom(16);
  }, [map, selectedPosition, value.latitude, value.longitude]);

  return (
    <div className="location-picker">
      <label className="location-header">School location</label>

      <div className="location-map">
        <Map
          defaultCenter={center}
          defaultZoom={selectedPosition ? 16 : 11}
          gestureHandling="none"
          clickableIcons={false}
          mapId="school-registration-map"
          style={{ width: "100%", height: "100%" }}
        >
          {selectedPosition && (
            <AdvancedMarker
              position={selectedPosition}
              title="School location"
              draggable={false}
            />
          )}
        </Map>
      </div>

      <div className="location-actions">
        <div className="location-panel-heading">
          <div>
            <strong>
              {locationSelected
                ? "School location selected"
                : "Choose the school location"}
            </strong>
            <small>
              {locationSelected
                ? "This location is locked to your selection."
                : "Select a school above to load its location."}
            </small>
          </div>
          <FiMapPin className={locationSelected ? "location-confirmed" : ""} />
        </div>
        <span className="location-hint">
          <FiMapPin />{" "}
          {locationSelected
            ? "Location locked to selected school"
            : "Select a school above to set the location"}
        </span>
      </div>
    </div>
  );
}
