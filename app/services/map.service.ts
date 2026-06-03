import axios from "axios";
import env from "@configs/env";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResponse {
  coordinates: [number, number][]; // [lat, lon]
  distance: number; // in meters
  duration: number; // in seconds
  shippingFee: number; // in VND
}

export interface AutocompleteResponse {
  address: string;
  latitude: number;
  longitude: number;
}

// Haversine distance formula in meters
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns meters
}

// Generate stable coords for a given address name
export function getStableCoords(id: string, text: string): { latitude: number; longitude: number } {
  const input = `${id}-${text}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 16.054404 + ((hash % 100) / 1000);
  const lon = 108.202167 + (((hash >> 2) % 100) / 1000);
  return { latitude: lat, longitude: lon };
}

// Business shipping fee rule:
// under 3km = 15,000 VND
// over 3km = +5,000 VND per extra km (rounded up)
export function calculateShippingFee(distanceMeters: number): number {
  const distanceKm = distanceMeters / 1000;
  if (distanceKm <= 3) {
    return 15000;
  }
  const extraKm = Math.ceil(distanceKm - 3);
  return 15000 + extraKm * 5000;
}

export class MapService {
  // ─────────────────────────────────────────────────────────────
  // 1. Autocomplete Search Address
  // ─────────────────────────────────────────────────────────────
  async autocomplete(q: string): Promise<AutocompleteResponse[]> {
    if (!q || q.trim().length === 0) return [];

    const apiKey = env.geoapifyApiKey;
    if (apiKey) {
      try {
        const response = await axios.get("https://api.geoapify.com/v1/geocode/autocomplete", {
          params: {
            text: q,
            apiKey: apiKey,
            limit: 5,
            lang: "vi",
            filter: "countrycode:vn",
          },
          timeout: 5000,
        });

        if (response.data && Array.isArray(response.data.features)) {
          return response.data.features.map((feat: any) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0];
            return {
              address: props.formatted || q,
              latitude: coords[1],
              longitude: coords[0],
            };
          });
        }
      } catch (error: any) {
        console.error("Geoapify Autocomplete failed, using fallback:", error.message);
      }
    }

    // Fallback: simulated autocomplete
    const dummyAddresses = [
      { address: "123 Đường Nguyễn Văn Linh, Đà Nẵng", lat: 16.0610, lon: 108.2150 },
      { address: "456 Đường Trần Hưng Đạo, Sơn Trà, Đà Nẵng", lat: 16.0680, lon: 108.2290 },
      { address: "789 Đường Lê Duẩn, Hải Châu, Đà Nẵng", lat: 16.0710, lon: 108.2190 },
      { address: "101 Đường Điện Biên Phủ, Thanh Khê, Đà Nẵng", lat: 16.0640, lon: 108.1960 },
      { address: "222 Đường Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng", lat: 16.0600, lon: 108.2460 },
      { address: "333 Đường Hùng Vương, Đà Nẵng", lat: 16.0675, lon: 108.2215 },
      { address: "444 Đường Bạch Đằng, Đà Nẵng", lat: 16.0650, lon: 108.2260 },
      { address: "555 Đường Tôn Đức Thắng, Liên Chiểu, Đà Nẵng", lat: 16.0750, lon: 108.1550 },
    ];

    const normalizedQuery = q.toLowerCase();
    const filtered = dummyAddresses.filter((item) =>
      item.address.toLowerCase().includes(normalizedQuery)
    );

    if (filtered.length > 0) {
      return filtered.map((item) => ({
        address: item.address,
        latitude: item.lat,
        longitude: item.lon,
      }));
    }

    // Dynamic generation if search doesn't match list
    const stableCoords = getStableCoords("search", q);
    return [
      {
        address: q,
        latitude: stableCoords.latitude,
        longitude: stableCoords.longitude,
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Geocode / Reverse Geocode
  // ─────────────────────────────────────────────────────────────
  async reverseGeocode(lat: number, lon: number): Promise<string> {
    const apiKey = env.geoapifyApiKey;
    if (apiKey) {
      try {
        const response = await axios.get("https://api.geoapify.com/v1/geocode/reverse", {
          params: {
            lat: lat,
            lon: lon,
            apiKey: apiKey,
            lang: "vi",
          },
          timeout: 5000,
        });

        if (response.data && Array.isArray(response.data.features) && response.data.features.length > 0) {
          const props = response.data.features[0].properties || {};
          return props.formatted || `Địa chỉ tại ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        }
      } catch (error: any) {
        console.error("Geoapify Reverse Geocode failed, using fallback:", error.message);
      }
    }

    // Fallback: Find closest dummy address in Da Nang for realism
    const dummyPlaces = [
      { address: "123 Đường Nguyễn Văn Linh, Vĩnh Trung, Thanh Khê, Đà Nẵng", lat: 16.0610, lon: 108.2150 },
      { address: "456 Đường Trần Hưng Đạo, An Hải Tây, Sơn Trà, Đà Nẵng", lat: 16.0680, lon: 108.2290 },
      { address: "789 Đường Lê Duẩn, Tân Chính, Thanh Khê, Đà Nẵng", lat: 16.0710, lon: 108.2190 },
      { address: "101 Đường Điện Biên Phủ, Chính Gián, Thanh Khê, Đà Nẵng", lat: 16.0640, lon: 108.1960 },
      { address: "222 Đường Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng", lat: 16.0600, lon: 108.2460 },
      { address: "333 Đường Hùng Vương, Hải Châu I, Hải Châu, Đà Nẵng", lat: 16.0675, lon: 108.2215 },
      { address: "444 Đường Bạch Đằng, Hải Châu I, Hải Châu, Đà Nẵng", lat: 16.0650, lon: 108.2260 },
      { address: "555 Đường Tôn Đức Thắng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng", lat: 16.0750, lon: 108.1550 },
      { address: "Cầu Rồng, An Hải Tây, Sơn Trà, Đà Nẵng", lat: 16.0612, lon: 108.2274 },
      { address: "Cầu Sông Hàn, Hải Châu I, Hải Châu, Đà Nẵng", lat: 16.0721, lon: 108.2267 },
      { address: "Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng", lat: 16.1200, lon: 108.2700 },
      { address: "Ngũ Hành Sơn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng", lat: 16.0020, lon: 108.2630 },
    ];

    let closestPlace = dummyPlaces[0];
    let minDistance = Infinity;

    for (const place of dummyPlaces) {
      const dist = getHaversineDistance(lat, lon, place.lat, place.lon);
      if (dist < minDistance) {
        minDistance = dist;
        closestPlace = place;
      }
    }

    // If coordinates are reasonably close to a mock location, return it, otherwise return coordinate-based address in Da Nang
    if (minDistance <= 1500) {
      return closestPlace.address;
    }
    return `Khu phố mới, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng (gần ${lat.toFixed(5)}, ${lon.toFixed(5)})`;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Routing (Restaurant to Customer)
  // ─────────────────────────────────────────────────────────────
  async getRoute(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Promise<RouteResponse> {
    const apiKey = env.orsApiKey;
    if (apiKey) {
      try {
        // OpenRouteService expects coordinates in [longitude, latitude] order
        const response = await axios.post(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
            coordinates: [
              [startLon, startLat],
              [endLon, endLat],
            ],
          },
          {
            headers: {
              Accept: "application/json, application/geo+json; charset=utf-8",
              Authorization: apiKey,
              "Content-Type": "application/json; charset=utf-8",
            },
            timeout: 5000,
          }
        );

        if (response.data && Array.isArray(response.data.features) && response.data.features.length > 0) {
          const feature = response.data.features[0];
          const geometry = feature.geometry || {};
          const summary = feature.properties?.summary || {};

          // Convert coordinates from [lon, lat] back to [lat, lon] for Leaflet
          const coordinates: [number, number][] = (geometry.coordinates || []).map((coord: any) => [
            coord[1],
            coord[0],
          ]);

          const distance = summary.distance || 0; // meters
          const duration = summary.duration || 0; // seconds

          return {
            coordinates,
            distance,
            duration,
            shippingFee: calculateShippingFee(distance),
          };
        }
      } catch (error: any) {
        console.error("OpenRouteService Routing failed, using fallback:", error.message);
      }
    }

    // Fallback: Simulated polyline route + distance & ETA calculation
    const distanceMeters = getHaversineDistance(startLat, startLon, endLat, endLon);
    
    // Average urban speed: 30 km/h -> 8.33 m/s. Base buffer: 5 mins
    const durationSeconds = Math.round(distanceMeters / 8.33) + 300; 

    // Create a 4-point street-like zig-zag polyline
    const coordinates: [number, number][] = [
      [startLat, startLon],
      [
        startLat + (endLat - startLat) * 0.3 + (Math.sin(startLon) * 0.001),
        startLon + (endLon - startLon) * 0.7 - (Math.cos(startLat) * 0.001),
      ],
      [
        startLat + (endLat - startLat) * 0.7 - (Math.sin(endLon) * 0.001),
        startLon + (endLon - startLon) * 0.3 + (Math.cos(endLat) * 0.001),
      ],
      [endLat, endLon],
    ];

    return {
      coordinates,
      distance: distanceMeters,
      duration: durationSeconds,
      shippingFee: calculateShippingFee(distanceMeters),
    };
  }
}
