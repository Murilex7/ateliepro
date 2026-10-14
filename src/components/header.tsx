"use client";

import { Bell, Menu, Search } from "lucide-react";
import { Logo } from "@/components/logo";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-rose-100 bg-white/95 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 md:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-700 md:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Abrir sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Logo on mobile centered */}
      <div className="flex flex-1 justify-center md:hidden">
        <Logo showText={true} />
      </div>

      <div className="flex flex-1 gap-x-4 self-stretch md:gap-x-6">
        <div className="relative flex flex-1 items-center max-w-md hidden md:flex">
          <label htmlFor="search-field" className="sr-only">
            Buscar
          </label>
          <Search
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-slate-400 pl-3"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-10 w-full rounded-md border-0 py-0 pl-10 pr-0 text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-rose-500 sm:text-sm transition-all hover:bg-slate-100 focus:bg-white"
            placeholder="Buscar clientes, pedidos..."
            type="search"
            name="search"
          />
        </div>
        <div className="flex items-center gap-x-4 md:gap-x-6 ml-auto">
          <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500 transition-colors">
            <span className="sr-only">Ver notificações</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
