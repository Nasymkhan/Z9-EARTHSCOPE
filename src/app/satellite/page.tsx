import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "ORBIT-02 Satellite Monitor",
  description: "A simulated Earth observation satellite operations dashboard.",
};

export default function SatellitePage() {
  redirect("/about#orbit-02");
}