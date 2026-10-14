"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Calculator,
  ClipboardList,
  DollarSign,
  Settings,
  LogOut,
  X
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Precificação", href: "/precificacao", icon: Calculator },
  { name: "Pedidos", href: "/pedidos", icon: ClipboardList },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

function SidebarContent({ setMobileMenuOpen }: { setMobileMenuOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const userName = profile?.name || user?.email?.split('@')[0] || 'U';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-6">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col mt-6 px-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        isActive
                          ? "bg-rose-50 text-rose-600"
                          : "text-slate-700 hover:text-rose-600 hover:bg-rose-50/50",
                        "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors"
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? "text-rose-600" : "text-slate-400 group-hover:text-rose-600",
                          "h-5 w-5 shrink-0 transition-colors"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto -mx-2 mb-4">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-slate-700 hover:bg-rose-50 rounded-md transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
                {userInitial}
              </div>
              <span aria-hidden="true" className="truncate flex-1 text-left">{userName}</span>
              <LogOut className="ml-auto h-5 w-5 text-slate-400" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="relative z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1 animate-slideInLeft bg-white/95 backdrop-blur-xl pb-4 pt-5 border-r border-rose-100">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button type="button" className="-m-2.5 p-2.5" onClick={() => setMobileMenuOpen(false)}>
                  <span className="sr-only">Fechar menu</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto">
                <SidebarContent setMobileMenuOpen={setMobileMenuOpen} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:z-50 md:flex md:w-[260px] md:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/95 backdrop-blur-xl border-r border-rose-100/50 shadow-[4px_0_24px_-12px_rgba(225,29,72,0.1)]">
          <SidebarContent setMobileMenuOpen={setMobileMenuOpen} />
        </div>
      </div>
    </>
  );
}
