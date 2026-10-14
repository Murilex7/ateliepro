"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Don't show sidebar/header on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <div className="md:pl-[260px] flex flex-col flex-1 min-h-screen">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-fadeIn">
          {children}
        </main>
      </div>
    </>
  );
}
