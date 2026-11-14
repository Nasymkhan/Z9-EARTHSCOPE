import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Data & Methods — Z9 EarthScope",
};

export default function MethodologyPage() {
  redirect("/data-sources#methodology");
}
