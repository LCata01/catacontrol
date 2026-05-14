import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/events")({ component: () => (
  <CrudTable table="events" title="Events" orderBy="event_date" fields={[
    { key: "name", label: "Name", required: true },
    { key: "event_date", label: "Date" },
    { key: "event_time", label: "Time" },
    { key: "capacity", label: "Capacity", type: "number" },
    { key: "status", label: "Status", type: "select", options: [
      { value: "draft", label: "draft" }, { value: "active", label: "active" }, { value: "closed", label: "closed" },
    ]},
  ]} defaults={{ status: "draft", capacity: 0 }} />
)});
