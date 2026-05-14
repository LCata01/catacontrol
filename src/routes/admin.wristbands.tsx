import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/wristbands")({ component: () => (
  <CrudTable table="wristbands" title="Wristbands" fields={[
    { key: "name", label: "Name" },
    { key: "price", label: "Price", type: "number" },
    { key: "active", label: "Active", type: "checkbox" },
  ]} defaults={{ active: true, price: 0 }} />
)});
