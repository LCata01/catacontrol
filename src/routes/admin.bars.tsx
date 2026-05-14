import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/bars")({ component: () => (
  <CrudTable table="bars" title="Barras" fields={[
    { key: "name", label: "Nombre" },
    { key: "terminal_code", label: "Código", readonly: true },
    { key: "active", label: "Activa", type: "checkbox" },
  ]} defaults={{ active: true }} />
)});
