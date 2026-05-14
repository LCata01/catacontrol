import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/entries")({ component: () => (
  <CrudTable table="entries" title="Entries" fields={[
    { key: "name", label: "Name" },
    { key: "active", label: "Active", type: "checkbox" },
  ]} defaults={{ active: true }} />
)});
