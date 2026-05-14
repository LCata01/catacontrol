import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/staff")({ component: () => (
  <CrudTable table="staff_members" title="Staff" orderBy="full_name" fields={[
    { key: "full_name", label: "Full name" },
    { key: "category", label: "Category", type: "select", options: [
      "dj","technical","security","photography","rrpp","owner","management","guest"
    ].map(v => ({ value: v, label: v.toUpperCase() })) },
    { key: "notes", label: "Notes" },
    { key: "active", label: "Active", type: "checkbox" },
  ]} defaults={{ active: true, category: "dj" }} />
)});
