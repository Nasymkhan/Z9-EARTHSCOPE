"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function AppChrome({ children }: { children: ReactNode }) {
  const isMissionControl = usePathname() === "/";

  return (
    <>
      <div className="min-w-0">
        {!isMissionControl && <Navbar />}
        <main id="main-content" className="relative">{children}</main>
        {!isMissionControl && <Footer />}
      </div>
    </>
  );
}
