import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/admin")({
  component: () => <Guard requireRole="superadmin"><AdminLayout /></Guard>,
});

const tabGroups: { label: string; tabs: { to: string; label: string }[] }[] = [
  { label: "Operación", tabs: [
    { to: "/admin", label: "En Vivo" },
    { to: "/admin/cashboxes", label: "Cajas Abiertas" },
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
  return (
    <div className="min-h-screen">
      <TopBar title="SUPERADMIN" />
      <nav className="sticky top-[64px] z-30 flex flex-col gap-1 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        {tabGroups.map((g) => (
          <div key={g.label} className="flex flex-wrap items-center gap-1">
            <span className="mr-2 w-36 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{g.label}</span>
            {g.tabs.map((t) => {
              const active = loc.pathname === t.to;
              return (
                <Link key={t.to} to={t.to}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  {t.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
