// Built-in gazetteer of major world cities — used for instant search and as a
// fallback when the OpenStreetMap Nominatim geocoder is unreachable. Coordinates
// are WGS-84. Extend freely; no fabricated precision (2 d.p. ≈ 1 km) is claimed.
export interface CityEntry {
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  population: number; // millions, approximate — for ranking only
}

export const CITIES: CityEntry[] = [
  { name: "Islamabad", country: "Pakistan", countryCode: "PK", latitude: 33.68, longitude: 73.05, population: 1.1 },
  { name: "Karachi", country: "Pakistan", countryCode: "PK", latitude: 24.86, longitude: 67.0, population: 16.0 },
  { name: "Lahore", country: "Pakistan", countryCode: "PK", latitude: 31.52, longitude: 74.36, population: 11.1 },
  { name: "Rawalpindi", country: "Pakistan", countryCode: "PK", latitude: 33.6, longitude: 73.07, population: 2.1 },
  { name: "Peshawar", country: "Pakistan", countryCode: "PK", latitude: 34.01, longitude: 71.58, population: 2.3 },
  { name: "Quetta", country: "Pakistan", countryCode: "PK", latitude: 30.18, longitude: 66.99, population: 1.0 },
  { name: "Faisalabad", country: "Pakistan", countryCode: "PK", latitude: 31.42, longitude: 73.08, population: 3.6 },
  { name: "Multan", country: "Pakistan", countryCode: "PK", latitude: 30.2, longitude: 71.47, population: 1.9 },
  { name: "New Delhi", country: "India", countryCode: "IN", latitude: 28.61, longitude: 77.21, population: 11.0 },
  { name: "Mumbai", country: "India", countryCode: "IN", latitude: 19.08, longitude: 72.88, population: 12.5 },
  { name: "Bengaluru", country: "India", countryCode: "IN", latitude: 12.97, longitude: 77.59, population: 8.4 },
  { name: "Kolkata", country: "India", countryCode: "IN", latitude: 22.57, longitude: 88.36, population: 4.5 },
  { name: "Chennai", country: "India", countryCode: "IN", latitude: 13.08, longitude: 80.27, population: 7.1 },
  { name: "Hyderabad", country: "India", countryCode: "IN", latitude: 17.38, longitude: 78.49, population: 6.9 },
  { name: "Beijing", country: "China", countryCode: "CN", latitude: 39.9, longitude: 116.4, population: 21.5 },
  { name: "Shanghai", country: "China", countryCode: "CN", latitude: 31.23, longitude: 121.47, population: 24.9 },
  { name: "Guangzhou", country: "China", countryCode: "CN", latitude: 23.13, longitude: 113.26, population: 13.3 },
  { name: "Shenzhen", country: "China", countryCode: "CN", latitude: 22.54, longitude: 114.06, population: 12.5 },
  { name: "Chengdu", country: "China", countryCode: "CN", latitude: 30.57, longitude: 104.07, population: 9.0 },
  { name: "Tokyo", country: "Japan", countryCode: "JP", latitude: 35.68, longitude: 139.69, population: 13.9 },
  { name: "Osaka", country: "Japan", countryCode: "JP", latitude: 34.69, longitude: 135.5, population: 2.7 },
  { name: "Seoul", country: "South Korea", countryCode: "KR", latitude: 37.57, longitude: 126.98, population: 9.7 },
  { name: "Singapore", country: "Singapore", countryCode: "SG", latitude: 1.35, longitude: 103.82, population: 5.9 },
  { name: "Bangkok", country: "Thailand", countryCode: "TH", latitude: 13.76, longitude: 100.5, population: 5.4 },
  { name: "Jakarta", country: "Indonesia", countryCode: "ID", latitude: -6.21, longitude: 106.85, population: 10.6 },
  { name: "Manila", country: "Philippines", countryCode: "PH", latitude: 14.6, longitude: 120.98, population: 1.8 },
  { name: "Dhaka", country: "Bangladesh", countryCode: "BD", latitude: 23.81, longitude: 90.41, population: 9.0 },
  { name: "Kathmandu", country: "Nepal", countryCode: "NP", latitude: 27.72, longitude: 85.32, population: 1.5 },
  { name: "Colombo", country: "Sri Lanka", countryCode: "LK", latitude: 6.93, longitude: 79.85, population: 0.75 },
  { name: "Kabul", country: "Afghanistan", countryCode: "AF", latitude: 34.53, longitude: 69.17, population: 4.4 },
  { name: "Tehran", country: "Iran", countryCode: "IR", latitude: 35.69, longitude: 51.39, population: 9.0 },
  { name: "Dubai", country: "United Arab Emirates", countryCode: "AE", latitude: 25.2, longitude: 55.27, population: 3.6 },
  { name: "Doha", country: "Qatar", countryCode: "QA", latitude: 25.29, longitude: 51.53, population: 2.4 },
  { name: "Riyadh", country: "Saudi Arabia", countryCode: "SA", latitude: 24.71, longitude: 46.68, population: 7.0 },
  { name: "Istanbul", country: "Türkiye", countryCode: "TR", latitude: 41.01, longitude: 28.98, population: 15.6 },
  { name: "London", country: "United Kingdom", countryCode: "GB", latitude: 51.51, longitude: -0.13, population: 8.9 },
  { name: "Manchester", country: "United Kingdom", countryCode: "GB", latitude: 53.48, longitude: -2.24, population: 0.55 },
  { name: "Paris", country: "France", countryCode: "FR", latitude: 48.86, longitude: 2.35, population: 2.1 },
  { name: "Berlin", country: "Germany", countryCode: "DE", latitude: 52.52, longitude: 13.4, population: 3.6 },
  { name: "Madrid", country: "Spain", countryCode: "ES", latitude: 40.42, longitude: -3.7, population: 3.2 },
  { name: "Rome", country: "Italy", countryCode: "IT", latitude: 41.9, longitude: 12.5, population: 2.8 },
  { name: "Amsterdam", country: "Netherlands", countryCode: "NL", latitude: 52.37, longitude: 4.9, population: 1.2 },
  { name: "Moscow", country: "Russia", countryCode: "RU", latitude: 55.76, longitude: 37.62, population: 12.6 },
  { name: "Kyiv", country: "Ukraine", countryCode: "UA", latitude: 50.45, longitude: 30.52, population: 2.9 },
  { name: "Cairo", country: "Egypt", countryCode: "EG", latitude: 30.04, longitude: 31.24, population: 10.1 },
  { name: "Lagos", country: "Nigeria", countryCode: "NG", latitude: 6.52, longitude: 3.38, population: 15.9 },
  { name: "Nairobi", country: "Kenya", countryCode: "KE", latitude: -1.29, longitude: 36.82, population: 4.4 },
  { name: "Addis Ababa", country: "Ethiopia", countryCode: "ET", latitude: 9.03, longitude: 38.74, population: 5.2 },
  { name: "Johannesburg", country: "South Africa", countryCode: "ZA", latitude: -26.2, longitude: 28.05, population: 5.9 },
  { name: "Cape Town", country: "South Africa", countryCode: "ZA", latitude: -33.92, longitude: 18.42, population: 4.8 },
  { name: "Casablanca", country: "Morocco", countryCode: "MA", latitude: 33.57, longitude: -7.59, population: 3.7 },
  { name: "Sydney", country: "Australia", countryCode: "AU", latitude: -33.87, longitude: 151.21, population: 5.0 },
  { name: "Melbourne", country: "Australia", countryCode: "AU", latitude: -37.81, longitude: 144.96, population: 4.9 },
  { name: "Perth", country: "Australia", countryCode: "AU", latitude: -31.95, longitude: 115.86, population: 2.0 },
  { name: "Auckland", country: "New Zealand", countryCode: "NZ", latitude: -36.85, longitude: 174.76, population: 1.6 },
  { name: "New York", country: "United States", countryCode: "US", latitude: 40.71, longitude: -74.01, population: 8.3 },
  { name: "Los Angeles", country: "United States", countryCode: "US", latitude: 34.05, longitude: -118.24, population: 3.9 },
  { name: "Chicago", country: "United States", countryCode: "US", latitude: 41.88, longitude: -87.63, population: 2.7 },
  { name: "Houston", country: "United States", countryCode: "US", latitude: 29.76, longitude: -95.37, population: 2.3 },
  { name: "San Francisco", country: "United States", countryCode: "US", latitude: 37.77, longitude: -122.42, population: 0.81 },
  { name: "Seattle", country: "United States", countryCode: "US", latitude: 47.61, longitude: -122.33, population: 0.74 },
  { name: "Miami", country: "United States", countryCode: "US", latitude: 25.76, longitude: -80.19, population: 0.47 },
  { name: "Phoenix", country: "United States", countryCode: "US", latitude: 33.45, longitude: -112.07, population: 1.6 },
  { name: "Toronto", country: "Canada", countryCode: "CA", latitude: 43.65, longitude: -79.38, population: 2.9 },
  { name: "Vancouver", country: "Canada", countryCode: "CA", latitude: 49.28, longitude: -123.12, population: 0.67 },
  { name: "Mexico City", country: "Mexico", countryCode: "MX", latitude: 19.43, longitude: -99.13, population: 9.2 },
  { name: "São Paulo", country: "Brazil", countryCode: "BR", latitude: -23.55, longitude: -46.63, population: 12.3 },
  { name: "Rio de Janeiro", country: "Brazil", countryCode: "BR", latitude: -22.91, longitude: -43.17, population: 6.7 },
  { name: "Buenos Aires", country: "Argentina", countryCode: "AR", latitude: -34.6, longitude: -58.38, population: 3.1 },
  { name: "Lima", country: "Peru", countryCode: "PE", latitude: -12.05, longitude: -77.04, population: 9.7 },
  { name: "Santiago", country: "Chile", countryCode: "CL", latitude: -33.45, longitude: -70.67, population: 5.6 },
  { name: "Bogotá", country: "Colombia", countryCode: "CO", latitude: 4.71, longitude: -74.07, population: 7.9 },
  { name: "Honolulu", country: "United States", countryCode: "US", latitude: 21.31, longitude: -157.86, population: 0.34 },
  { name: "Reykjavik", country: "Iceland", countryCode: "IS", latitude: 64.15, longitude: -21.94, population: 0.13 },
  { name: "Oslo", country: "Norway", countryCode: "NO", latitude: 59.91, longitude: 10.75, population: 0.7 },
  { name: "Stockholm", country: "Sweden", countryCode: "SE", latitude: 59.33, longitude: 18.07, population: 1.0 },
  { name: "Helsinki", country: "Finland", countryCode: "FI", latitude: 60.17, longitude: 24.94, population: 0.65 },
  { name: "Greenwich", country: "United Kingdom", countryCode: "GB", latitude: 51.48, longitude: -0.0, population: 0.09 },
  { name: "Nairobi", country: "Kenya", countryCode: "KE", latitude: -1.29, longitude: 36.82, population: 4.4 },
  { name: "Doha", country: "Qatar", countryCode: "QA", latitude: 25.29, longitude: 51.53, population: 2.4 },
];

export function searchCities(query: string, limit = 8): CityEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored = CITIES.map((c) => {
    const n = c.name.toLowerCase();
    const full = `${c.name}, ${c.country}`.toLowerCase();
    let score = -1;
    if (n.startsWith(q)) score = 100;
    else if (n.includes(q)) score = 60;
    else if (full.includes(q)) score = 40;
    else if (c.country.toLowerCase().startsWith(q)) score = 20;
    return { c, score };
  })
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score || b.c.population - a.c.population)
    .slice(0, limit);
  return scored.map((s) => s.c);
}
