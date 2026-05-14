import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/tickets")({ component: () => (
  <CrudTable table="ticket_types" title="Ticket types" fields={[
    { key: "name", label: "Name" },
    { key: "price", label: "Price", type: "number" },
    { key: "is_complimentary", label: "Complimentary", type: "checkbox" },
    { key: "active", label: "Active", type: "checkbox" },
  ]} defaults={{ active: true, is_complimentary: false, price: 0 }} />
)});
