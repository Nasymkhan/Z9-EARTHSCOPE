import EarthGlobe from "@/components/earth-globe";

export default function CinematicHeroEarth() {
  return (
    <div className="cinematic-earth-wrapper relative h-full w-full overflow-visible">
      <div className="cinematic-earth-intro relative h-full w-full origin-center">
        <EarthGlobe />
      </div>
    </div>
  );
}
