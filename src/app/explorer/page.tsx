import type { Metadata } from "next";
import ExplorerWorkspace from "@/components/explorer-workspace";

export const metadata: Metadata = {
  title: "Trend Explorer — Run a Real NASA Earth Analysis",
  description:
    "Choose a NASA POWER variable, location, time period and resolution — then compute Sen's slope, Mann–Kendall significance and seasonal trend statistics on live NASA observations.",
};

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const num = (v: string | string[] | undefined) => {
    const raw = Array.isArray(v) ? v[0] : v;
    const n = raw ? Number(raw) : undefined;
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <ExplorerWorkspace
      initialVariable={str(sp.var)}
      initialLat={num(sp.lat)}
      initialLon={num(sp.lon)}
      initialName={str(sp.name)}
      initialStart={str(sp.start)}
      initialEnd={str(sp.end)}
      initialResolution={str(sp.res)}
    />
  );
}
