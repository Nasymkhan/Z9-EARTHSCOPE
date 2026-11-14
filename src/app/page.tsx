import type { Metadata } from "next";
import EarthExperienceHome from "@/components/earth-experience-home";

export const metadata: Metadata = {
  title: "Z9 EarthScope — Earth System Trend Detective",
  description: "Explore seven NASA POWER environmental variables, visualize historical change by location, and test trend magnitude and statistical significance.",
};

export default function HomePage() {
  return <EarthExperienceHome />;
}
