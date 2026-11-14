import type { Metadata } from "next";
import CompareWorkspace from "@/components/compare-workspace";

export const metadata: Metadata = {
  title: "Compare Locations — Side-by-Side NASA Trend Analysis",
  description:
    "Compare the same NASA POWER variable across two locations and periods — Sen's slope gap, significance at your α threshold, overlay and ledger tables.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const aLat = num(sp.aLat);
  const aLon = num(sp.aLon);
  const bLat = num(sp.bLat);
  const bLon = num(sp.bLon);

  return (
    <CompareWorkspace
      initialVariable={str(sp.var)}
      initialStart={str(sp.start)}
      initialEnd={str(sp.end)}
      initialResolution={str(sp.res) === "daily" ? "daily" : "monthly"}
      initialA={aLat !== undefined && aLon !== undefined ? { name: str(sp.aName) ?? "Location A", lat: aLat, lon: aLon } : undefined}
      initialB={bLat !== undefined && bLon !== undefined ? { name: str(sp.bName) ?? "Location B", lat: bLat, lon: bLon } : undefined}
    />
  );
}
