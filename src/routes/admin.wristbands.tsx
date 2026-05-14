import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/wristbands")({ component: () => (
  <CrudTable table="wristbands" title="Pulseras" fields={[
    { key: "name", label: "Nombre" },
    { key: "price", label: "Precio", type: "number" },
    { key: "active", label: "Activa", type: "checkbox" },
  ]} defaults={{ active: true, price: 0 }} />
)});
