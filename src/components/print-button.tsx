"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary no-print !text-[0.74rem]">
      <Printer size={15} /> Print / Save as PDF
    </button>
  );
}
