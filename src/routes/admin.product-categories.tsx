import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/product-categories")({ component: () => (
  <CrudTable table="product_categories" title="Categorías de productos" fields={[
    { key: "name", label: "Nombre", required: true },
    { key: "active", label: "Activo", type: "checkbox" },
  ]} defaults={{ active: true }} />
)});
