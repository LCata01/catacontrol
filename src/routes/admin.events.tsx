import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/events")({ component: () => (
  <CrudTable table="events" title="Eventos" orderBy="event_date" fields={[
    { key: "name", label: "Nombre", required: true },
    { key: "event_date", label: "Fecha", type: "date" },
    { key: "event_time", label: "Hora", type: "time" },
    { key: "capacity", label: "Capacidad", type: "number" },
    { key: "status", label: "Estado", type: "select", options: [
      { value: "draft", label: "Borrador" },
      { value: "active", label: "Activo" },
      { value: "closed", label: "Cerrado" },
    ]},
  ]} defaults={{ status: "draft", capacity: 0 }} />
)});
