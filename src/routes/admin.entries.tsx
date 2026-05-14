import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/entries")({ component: () => (
  <CrudTable table="entries" title="Entradas" fields={[
    { key: "name", label: "Nombre" },
    { key: "active", label: "Activa", type: "checkbox" },
  ]} defaults={{ active: true }} />
)});
