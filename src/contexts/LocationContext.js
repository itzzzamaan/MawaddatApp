import * as Location from "expo-location";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

const LocationContext = createContext({ locationName: null, currentCity: null });

export function LocationProvider({ children }) {
  const [locationName, setLocationName] = useState(null);
  const [currentCity, setCurrentCity] = useState(null);
  const currentCityRef = useRef(null);

  useEffect(() => {
    let active = true;
    let subscription;

    const updateLocation = async (coordinates) => {
      try {
        const addresses = await Location.reverseGeocodeAsync(coordinates);
        if (!active || !addresses.length) return;

        const place = addresses[0];
        const city = place.city || place.district || place.subregion;
        if (!city) return;

        const previousCity = currentCityRef.current;
        const changed = previousCity && previousCity.toLowerCase() !== city.toLowerCase();
        currentCityRef.current = city;
        setCurrentCity(city);
        setLocationName([city, place.region].filter(Boolean).join(", "));

        if (changed) {
          Alert.alert(
            "Location updating",
            `Your location changed to ${city}. Programs are refreshing.`,
          );
        }
      } catch (error) {
        console.log("Failed to resolve current city", error);
      }
    };

    const startTracking = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active || permission.status !== "granted") return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await updateLocation(position.coords);

        if (!active) return;
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 1000,
            timeInterval: 60000,
          },
          (nextPosition) => updateLocation(nextPosition.coords),
        );
      } catch (error) {
        console.log("Failed to track current location", error);
      }
    };

    startTracking();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return (
    <LocationContext.Provider value={{ locationName, currentCity }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useCurrentLocation() {
  return useContext(LocationContext);
}