import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/bars")({ component: () => (
  <CrudTable table="bars" title="Bars" fields={[
    { key: "name", label: "Name" },
    { key: "active", label: "Active", type: "checkbox" },
  ]} defaults={{ active: true }} />
)});
