"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpenCheck,
  CircleHelp,
  Database,
  Globe2,
  Layers3,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/logo";

const EARTH_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/#overview", icon: Layers3 },
  { label: "Atmosphere & ecosystems", href: "/#features", icon: Globe2 },
  { label: "EarthScope tools", href: "/#offerings", icon: BarChart3 },
  { label: "Interactive Earth", href: "/explorer", icon: MapPin },
];

const RESEARCH_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Explore & analyze", href: "/explorer", icon: BarChart3 },
  { label: "Location Compare", href: "/compare", icon: ArrowLeftRight },
  { label: "Saved Investigations", href: "/history", icon: BookOpenCheck },
  { label: "Data & Methods", href: "/data-sources", icon: Database },
  { label: "About & Simulation", href: "/about", icon: CircleHelp },
];

function RailLink({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`earth-sidebar-link${active ? " is-active" : ""}`}
      data-label={label}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}

export default function NavigationRail() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    const route = href.split("#")[0] || "/";
    return route === "/"
      ? pathname === "/" && href === "/#overview"
      : pathname === route || pathname.startsWith(`${route}/`);
  };

  return (
    <aside className="earth-sidebar" aria-label="EarthScope navigation">
      <div className="earth-sidebar-panel">
        <Link href="/#overview" className="earth-sidebar-brand" aria-label="Z9 EarthScope overview" title="Z9 EarthScope">
          <Logo compact />
        </Link>
        <nav className="earth-sidebar-links" aria-label="Earth sections">
          {EARTH_LINKS.map((link) => <RailLink key={link.href} {...link} active={isActive(link.href)} />)}
        </nav>
        <span className="earth-sidebar-divider" aria-hidden="true" />
        <nav className="earth-sidebar-links earth-sidebar-research" aria-label="Research tools">
          {RESEARCH_LINKS.map((link) => <RailLink key={link.href} {...link} active={isActive(link.href)} />)}
        </nav>
        <span className="earth-sidebar-vertical-label" aria-hidden="true">Earth System Trend Detective</span>
      </div>
    </aside>
  );
}