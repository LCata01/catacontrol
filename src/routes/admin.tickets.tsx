import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/tickets")({ component: () => (
  <CrudTable table="ticket_types" title="Tipos de Ticket" fields={[
    { key: "name", label: "Nombre" },
    { key: "price", label: "Precio", type: "number" },
    { key: "people_per_ticket", label: "Personas por ticket", type: "number" },
    { key: "is_complimentary", label: "Cortesía", type: "checkbox" },
    { key: "active", label: "Activo", type: "checkbox" },
  ]} defaults={{ active: true, is_complimentary: false, price: 0, people_per_ticket: 1 }} />
)});
