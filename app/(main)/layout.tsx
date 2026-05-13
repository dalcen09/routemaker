"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import MapPageContent from "@/components/MapPageContent";

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname === "/map";

  return (
    <AppShell>
      {/* Map page — always mounted, hidden when not on /map so state is preserved */}
      <div className={isMap ? "block" : "hidden"}>
        <MapPageContent />
      </div>
      {/* All other pages */}
      <div className={isMap ? "hidden" : "block"}>
        {children}
      </div>
    </AppShell>
  );
}
