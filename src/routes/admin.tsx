import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/admin")({
  component: () => <Guard requireRole="superadmin"><AdminLayout /></Guard>,
});

const tabs = [
  { to: "/admin", label: "En Vivo" },
  { to: "/admin/events", label: "Eventos" },
  { to: "/admin/users", label: "Usuarios" },
  { to: "/admin/staff", label: "Staff" },
  { to: "/admin/products", label: "Productos" },
  { to: "/admin/tickets", label: "Tickets" },
  { to: "/admin/wristbands", label: "Pulseras" },
  { to: "/admin/bars", label: "Barras" },
  { to: "/admin/entries", label: "Entradas" },
  { to: "/admin/reports", label: "Reportes" },
  { to: "/admin/settings", label: "Ticket" },
];

function AdminLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen">
      <TopBar title="SUPERADMIN" />
      <nav className="sticky top-[64px] z-30 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        {tabs.map((t) => {
          const active = loc.pathname === t.to;
          return (
            <Link key={t.to} to={t.to}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-bold uppercase tracking-widest ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
