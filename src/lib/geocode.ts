/**
 * Geocoding utility using OpenStreetMap Nominatim API (free, no API key needed)
 * Rate limited to 1 request per second per their usage policy
 */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Build a search query from location components
 */
function buildSearchQuery(location: {
  name: string;
  address?: string | null;
  streetName?: string | null;
  streetNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipcode?: string | null;
}): string {
  // Try to build the most specific query possible
  const parts: string[] = [];

  // Full address is best
  if (location.address) {
    parts.push(location.address);
  } else if (location.streetNumber && location.streetName) {
    parts.push(`${location.streetNumber} ${location.streetName}`);
  } else if (location.streetName) {
    parts.push(location.streetName);
  }

  // Add city/state/country
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);
  if (location.country && location.country !== "USA") {
    parts.push(location.country);
  } else if (parts.length > 0) {
    parts.push("USA"); // Default to USA
  }

  // If we have parts, use them; otherwise fall back to the name
  if (parts.length > 0) {
    return parts.join(", ");
  }

  // Fall back to just the name (might be a city name like "San Francisco")
  return location.name;
}

/**
 * Geocode a single location using Nominatim
 */
export async function geocodeLocation(location: {
  name: string;
  address?: string | null;
  streetName?: string | null;
  streetNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipcode?: string | null;
}): Promise<GeocodeResult | null> {
  const query = buildSearchQuery(location);

  if (!query || query.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a User-Agent
        "User-Agent": "SkateMagArchive/1.0 (geocoding locations)",
      },
    });

    if (!response.ok) {
      console.error(`Geocoding failed for "${query}": ${response.status}`);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      console.log(`No results for "${query}"`);
      return null;
    }

    const result = results[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error(`Geocoding error for "${query}":`, error);
    return null;
  }
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
