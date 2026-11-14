import Image from "next/image";

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="group inline-flex items-center gap-2 select-none" aria-label="Z9 EarthScope">
      <div className={`relative flex items-center overflow-hidden ${compact ? "h-8" : "h-9 sm:h-11"}`}>
        <Image
          src="/z9-earthscope-logo.jpg"
          alt="Z9 EarthScope — Understanding Earth Through Data"
          width={compact ? 120 : 180}
          height={compact ? 40 : 60}
          priority
          className="h-full w-auto object-contain mix-blend-screen transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </div>
    </span>
  );
}
