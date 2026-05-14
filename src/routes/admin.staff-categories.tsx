import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/staff-categories")({ component: () => (
  <CrudTable table="staff_categories" title="Categorías de staff" fields={[
    { key: "name", label: "Nombre", required: true },
    { key: "active", label: "Activo", type: "checkbox" },
  ]} defaults={{ active: true }} />
)});
