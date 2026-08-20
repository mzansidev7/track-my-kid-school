import { useEffect, useRef } from "react";
import { FiBriefcase } from "react-icons/fi";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function PlacesInput({ value, onChange, onPlaceSelected, disabled }) {
  const inputRef = useRef(null);
  const placesLibrary = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLibrary || !inputRef.current || disabled) return undefined;

    const autocomplete = new placesLibrary.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
      componentRestrictions: { country: "za" },
    });
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (!location) return;

      onPlaceSelected({
        name: place.name || "",
        address: place.formatted_address || place.name || "",
        latitude: location.lat(),
        longitude: location.lng(),
      });
    });

    return () => listener.remove();
  }, [disabled, onPlaceSelected, placesLibrary]);

  return (
    <span className="input-wrap school-search-input">
      <FiBriefcase />
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required
        placeholder="Search schools or places"
        autoComplete="off"
      />
    </span>
  );
}

export default function SchoolSearchInput(props) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <PlacesInput {...props} />;
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <PlacesInput {...props} />
    </APIProvider>
  );
}
