import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/admin")({
  component: () => <Guard requireRole="superadmin"><AdminLayout /></Guard>,
});

const tabGroups: { label: string; tabs: { to: string; label: string }[] }[] = [
  { label: "Operación", tabs: [
    { to: "/admin", label: "En Vivo" },
    { to: "/admin/cashboxes", label: "Cajas Abiertas" },
    { to: "/admin/shift-closures", label: "Corte de Cajas" },
    { to: "/admin/reports", label: "Reportes" },
  ]},
  { label: "Tickets y Pulseras", tabs: [
    { to: "/admin/tickets", label: "Tickets" },
    { to: "/admin/wristbands", label: "Pulseras" },
  ]},
  { label: "Productos", tabs: [
    { to: "/admin/products", label: "Productos" },
    { to: "/admin/product-categories", label: "Categorías Productos" },
  ]},
  { label: "Staff", tabs: [
    { to: "/admin/staff", label: "Staff" },
    { to: "/admin/staff-categories", label: "Categorías Staff" },
  ]},
  { label: "Puestos físicos", tabs: [
    { to: "/admin/bars", label: "Barras" },
    { to: "/admin/entries", label: "Entradas" },
  ]},
  { label: "Impresión", tabs: [
    { to: "/admin/settings", label: "Ticket" },
    { to: "/admin/printing", label: "Impresión" },
  ]},
  { label: "Configuración", tabs: [
    { to: "/admin/events", label: "Eventos" },
    { to: "/admin/users", label: "Usuarios" },
  ]},
];

function AdminLayout() {
  const loc = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [loc.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar title="SUPERADMIN" />
      <nav ref={navRef} className="sticky top-[64px] z-30 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-1">
          {tabGroups.map((g) => {
            const isActiveGroup = g.tabs.some((t) => loc.pathname === t.to);
            const isOpen = openGroup === g.label;
            return (
              <div key={g.label} className="relative">
                <button
                  onClick={() => setOpenGroup(isOpen ? null : g.label)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${isActiveGroup ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  {g.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 flex min-w-[12rem] flex-col gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
                    {g.tabs.map((t) => {
                      const active = loc.pathname === t.to;
                      return (
                        <Link key={t.to} to={t.to} onClick={() => setOpenGroup(null)}
                          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                          {t.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
