import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/staff")({ component: () => (
  <CrudTable table="staff_members" title="Staff" orderBy="full_name" fields={[
    { key: "full_name", label: "Nombre completo" },
    { key: "category", label: "Categoría", type: "select", options: [
      { value: "dj", label: "DJ" },
      { value: "technical", label: "Técnico" },
      { value: "security", label: "Seguridad" },
      { value: "photography", label: "Fotografía" },
      { value: "rrpp", label: "RRPP" },
      { value: "owner", label: "Dueño" },
      { value: "management", label: "Gerencia" },
      { value: "guest", label: "Invitado" },
    ] },
    { key: "notes", label: "Notas" },
    { key: "active", label: "Activo", type: "checkbox" },
  ]} defaults={{ active: true, category: "dj" }} />
)});
