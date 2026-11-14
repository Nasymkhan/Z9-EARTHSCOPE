"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MousePointerClick } from "lucide-react";

const EarthMap = dynamic(() => import("./earth-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-xl" />,
});

export default function HomeMapTeaser({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <div className={`home-map-teaser relative h-full w-full ${compact ? "home-map-teaser-compact min-h-[92px]" : "min-h-[280px] md:min-h-[340px]"}`}>
      <EarthMap
        height="100%"
        minHeight={compact ? 92 : 260}
        showControls={!compact}
        initialZoom={2.2}
        initialCenter={[22, 40]}
        locations={[
          { name: "Islamabad", latitude: 33.68, longitude: 73.05, color: "#2563EB" },
          { name: "Karachi", latitude: 24.86, longitude: 67.0, color: "#0F9D9A" },
          { name: "Lahore", latitude: 31.52, longitude: 74.36, color: "#0F9D9A" },
          { name: "Tokyo", latitude: 35.68, longitude: 139.69, color: "#0F9D9A" },
          { name: "Cairo", latitude: 30.04, longitude: 31.24, color: "#0F9D9A" },
          { name: "Nairobi", latitude: -1.29, longitude: 36.82, color: "#0F9D9A" },
          { name: "London", latitude: 51.51, longitude: -0.13, color: "#0F9D9A" },
          { name: "New York", latitude: 40.71, longitude: -74.01, color: "#0F9D9A" },
        ]}
        onPick={(la, lo) => router.push(`/explorer?lat=${la}&lon=${lo}&name=Custom%20point%20(${la.toFixed(2)}%C2%B0%2C%20${lo.toFixed(2)}%C2%B0)`)}
      />
      {!compact && <div className="pointer-events-none absolute left-3 top-[98px] z-[500] inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 truncate rounded-md border border-cyan/30 bg-abyss/88 px-3.5 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-cyan backdrop-blur sm:bottom-3 sm:top-auto sm:max-w-none">
        <MousePointerClick size={12} /> Click anywhere to analyze that point
      </div>}
    </div>
  );
}
