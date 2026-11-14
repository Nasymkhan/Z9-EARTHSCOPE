"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import countriesTopology from "world-atlas/countries-110m.json";
import type { Feature, FeatureCollection, Polygon, Position } from "geojson";
import type { Topology } from "topojson-specification";
import { Maximize2, Minimize2, RotateCcw } from "lucide-react";

const topology = countriesTopology as unknown as Topology;
const countryFeatures = (feature(topology, topology.objects.countries) as FeatureCollection).features;

export interface MapLocation {
  name: string;
  latitude: number;
  longitude: number;
  color?: string;
  detail?: string;
}

interface Props {
  locations?: MapLocation[];
  selected?: { latitude: number; longitude: number } | null;
  onPick?: (latitude: number, longitude: number) => void;
  onCoordinateHover?: (latitude: number, longitude: number) => void;
  height?: number | string;
  minHeight?: number;
  initialCenter?: [number, number];
  initialZoom?: number;
  fitToLocations?: boolean;
  interactive?: boolean;
  showControls?: boolean;
  line?: { latitude: number; longitude: number }[];
  initialLayer?: "nasa" | "satellite";
}

function createLayers() {
  return {
    nasaBlueMarble: L.tileLayer(
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/2024-06-15/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
    {
      maxZoom: 8,
      attribution: 'NASA Blue Marble (public domain) · <a href="https://gibs.earthdata.nasa.gov/">NASA GIBS</a>',
    }
    ),
    nasaModis: L.tileLayer(
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2025-06-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
    {
      maxZoom: 9,
      attribution: 'Imagery: NASA EOSDIS GIBS · MODIS Terra true color (June 2025) · public domain · <a href="https://gibs.earthdata.nasa.gov/">NASA GIBS</a>',
    }
    ),
    streets: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }),
    topo: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri — Esri, DeLorme, NAVTEQ, TomTom",
    }),
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    }),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: "abcd",
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }),
  };
}

function pinIcon(color: string, label?: string) {
  // Deterministic SVG div icon — no external image assets required.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <circle cx="17" cy="17" r="15.5" fill="${color}" fill-opacity="0.16"/>
      <path d="M17 41s-11.5-12.2-11.5-21.4A11.5 11.5 0 0 1 17 8a11.5 11.5 0 0 1 11.5 11.6C28.5 28.8 17 41 17 41z" fill="#071426" stroke="${color}" stroke-width="1.8"/>
      <circle cx="17" cy="19.4" r="4.6" fill="${color}"/>
      ${label ? `<circle cx="28.5" cy="7" r="7.5" fill="${color}" stroke="#04091a" stroke-width="1.6"/><text x="28.5" y="10.1" font-size="9.5" font-weight="700" text-anchor="middle" fill="#04091a" font-family="monospace">${label}</text>` : ""}
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "z9-marker",
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

export default function EarthMap({
  locations = [],
  selected = null,
  onPick,
  onCoordinateHover,
  height = 480,
  minHeight = 260,
  initialCenter = [30, 20],
  initialZoom = 2.4,
  fitToLocations = false,
  interactive = true,
  showControls = true,
  line,
  initialLayer = "nasa",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const countryLayerRef = useRef<L.LayerGroup | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const selectedRef = useRef<L.Marker | null>(null);
  const layersRef = useRef<ReturnType<typeof createLayers> | null>(null);
  if (!layersRef.current) layersRef.current = createLayers();
  const layers = layersRef.current;
  const onPickRef = useRef(onPick);
  const onHoverRef = useRef(onCoordinateHover);
  onPickRef.current = onPick;
  onHoverRef.current = onCoordinateHover;
  const [fullscreen, setFullscreen] = useState(false);

  // ---- init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 16,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      dragging: interactive,
      keyboard: interactive,
      boxZoom: interactive,
      touchZoom: interactive,
    });
    if (interactive && showControls) L.control.zoom({ position: "bottomright" }).addTo(map);
    (initialLayer === "satellite" ? layers.satellite : layers.nasaBlueMarble).addTo(map);
    if (interactive && showControls) {
      L.control.layers(
        {
          "NASA Blue Marble (GIBS)": layers.nasaBlueMarble,
          "NASA MODIS True Color (GIBS)": layers.nasaModis,
          "Deep Space Dark": layers.dark,
          "OpenStreetMap": layers.streets,
          "Esri Satellite": layers.satellite,
          "Esri Topographic": layers.topo,
        },
        {},
        { position: "topright", collapsed: true }
      ).addTo(map);
    }
    countryLayerRef.current = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);

    if (interactive) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onPickRef.current?.(
          Math.round(e.latlng.lat * 10000) / 10000,
          Math.round((((e.latlng.lng + 540) % 360) - 180) * 10000) / 10000
        );
      });
      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        onHoverRef.current?.(e.latlng.lat, ((e.latlng.lng + 540) % 360) - 180);
      });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- render fitted markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    const countryLayer = countryLayerRef.current;
    if (!map || !layer || !countryLayer) return;
    countryLayer.clearLayers();
    layer.clearLayers();
    const pointsToHighlight = selected
      ? [...locations, { name: "Selected point", latitude: selected.latitude, longitude: selected.longitude, color: "#D69A32" }]
      : locations;
    if (pointsToHighlight.length === 0) return;

    const highlightedCountries = new Set<string>();
    const countriesToHighlight: { feature: (typeof countryFeatures)[number]; color: string }[] = [];
    pointsToHighlight.forEach((location) => {
      const country = countryFeatures.find((candidate) => geoContains(candidate, [location.longitude, location.latitude]));
      if (!country) return;
      const countryId = String(country.id ?? `${location.latitude},${location.longitude}`);
      if (highlightedCountries.has(countryId)) return;
      highlightedCountries.add(countryId);
      countriesToHighlight.push({ feature: country, color: location.color ?? "#0F9D9A" });
    });

    if (countriesToHighlight.length > 0) {
      const countryRings: Position[][] = [];
      countriesToHighlight.forEach(({ feature: country }) => {
        if (country.geometry.type === "Polygon") countryRings.push(country.geometry.coordinates[0]);
        if (country.geometry.type === "MultiPolygon") {
          country.geometry.coordinates.forEach((polygon) => countryRings.push(polygon[0]));
        }
      });
      const mask: Feature<Polygon> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ...countryRings],
        },
      };
      L.geoJSON(mask, {
        interactive: false,
        style: { stroke: false, fillColor: "#020816", fillOpacity: 0.52, fillRule: "evenodd" },
      }).addTo(countryLayer);
    }

    countriesToHighlight.forEach(({ feature: country, color }) => {
      const highlight = L.geoJSON(country, {
        interactive: false,
        style: {
          color,
          weight: 3,
          opacity: 0.95,
          fillColor: color,
          fillOpacity: 0.2,
        },
      }).addTo(countryLayer);
      highlight.eachLayer((boundary) => {
        if (boundary instanceof L.Path) {
          const path = boundary.getElement();
          if (path instanceof SVGElement) path.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color})`;
        }
      });
    });

    const markers: L.Marker[] = [];
    locations.forEach((loc, i) => {
      const color = loc.color ?? "#0F9D9A";
      const marker = L.marker([loc.latitude, loc.longitude], { icon: pinIcon(color, locations.length > 1 ? String(i + 1) : undefined) });
      marker.bindPopup(
        `<div style="font-family:var(--font-plex-mono,monospace);font-size:11px;line-height:1.55">
           <div style="font-weight:700;color:#0F9D9A;margin-bottom:4px">${loc.name}</div>
           <div>LAT ${loc.latitude.toFixed(4)}°</div>
           <div>LON ${loc.longitude.toFixed(4)}°</div>
           ${loc.detail ? `<div style="margin-top:4px;color:#93A4B7">${loc.detail}</div>` : ""}
         </div>`
      );
      marker.addTo(layer);
      markers.push(marker);
    });

    if (fitToLocations && markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.35), { maxZoom: 6, animate: true });
    }
  }, [locations, selected, fitToLocations]);

  // ---- dashed transect line between locations
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lineRef.current) {
      lineRef.current.remove();
      lineRef.current = null;
    }
    if (line && line.length >= 2) {
      lineRef.current = L.polyline(
        line.map((p) => [p.latitude, p.longitude] as [number, number]),
        { color: "#0F9D9A", weight: 2, dashArray: "7 7", opacity: 0.75 }
      ).addTo(map);
    }
  }, [line]);

  // ---- fullscreen handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = fullscreen ? "hidden" : "";
    const map = mapRef.current;
    if (map) {
      const t = setTimeout(() => map.invalidateSize(), 80);
      return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    }
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [fullscreen]);

  const resetView = () => {
    const map = mapRef.current;
    if (map) map.setView(initialCenter, initialZoom, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  // ---- selected crosshair marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selectedRef.current) {
      selectedRef.current.remove();
      selectedRef.current = null;
    }
    if (selected) {
      const marker = L.marker([selected.latitude, selected.longitude], {
        icon: pinIcon("#D69A32"),
        zIndexOffset: 500,
      }).addTo(map);
      marker.bindTooltip("Selected analysis point", { direction: "top", offset: [0, -40] });
      selectedRef.current = marker;
    }
  }, [selected]);

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[60] isolate h-screen w-screen overflow-hidden bg-abyss"
          : "relative isolate z-0 w-full overflow-hidden rounded-lg border border-line-strong"
      }
      style={fullscreen ? undefined : { height, minHeight }}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        role={interactive ? "application" : undefined}
        aria-label={interactive ? "Interactive world map — click anywhere to select analysis coordinates" : undefined}
      />
      {/* control cluster */}
      {interactive && showControls && <div className="absolute left-3 top-3 z-[500] flex flex-col gap-1.5">
        <button
          onClick={resetView}
          className="grid h-9 w-9 place-items-center rounded-md border border-line-strong bg-deep/95 text-ice shadow-lg backdrop-blur-sm transition-colors hover:border-cyan/50 hover:text-cyan"
          title="Reset view"
          aria-label="Reset map view"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-md border border-line-strong bg-deep/95 text-ice shadow-lg backdrop-blur-sm transition-colors hover:border-cyan/50 hover:text-cyan"
          title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen map"}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>}
      {fullscreen && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-md border border-line bg-abyss/90 px-4 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mist backdrop-blur">
          Esc — exit fullscreen
        </div>
      )}
    </div>
  );
}
