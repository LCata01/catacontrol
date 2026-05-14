import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/staff")({ component: () => (
  <CrudTable table="staff_members" title="Staff" orderBy="full_name" fields={[
    { key: "full_name", label: "Nombre completo" },
    { key: "category", label: "Categoría", type: "select", optionsFrom: { table: "staff_categories" } },
    { key: "notes", label: "Notas" },
    { key: "active", label: "Activo", type: "checkbox" },
  ]} defaults={{ active: true }} />
)});
