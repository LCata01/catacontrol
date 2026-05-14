import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";

export const Route = createFileRoute("/workstation")({
  component: () => (
    <Guard requireRole="cashier">
      <Outlet />
    </Guard>
  ),
});
