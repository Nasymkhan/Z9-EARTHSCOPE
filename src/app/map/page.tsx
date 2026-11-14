import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Explore Earth — The Interactive NASA Observation Console",
  description:
    "The Z9 EarthScope signature console: NASA Blue Marble basemap, click-to-analyze any coordinate, latest NASA POWER observation on pin drop, and one-click scientific trend verdicts.",
};

export default function MapPage() {
  redirect("/explorer#location");
}
