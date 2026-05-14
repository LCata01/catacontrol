import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/products")({ component: () => (
  <CrudTable table="products" title="Productos" fields={[
    { key: "name", label: "Nombre" },
    { key: "category", label: "Categoría", type: "select",
      optionsFrom: { table: "product_categories" } },
    { key: "price", label: "Precio", type: "number" },
    { key: "cost", label: "Costo", type: "number" },
    { key: "stock", label: "Stock", type: "number" },
    { key: "active", label: "Activo", type: "checkbox" },
  ]} defaults={{ active: true, price: 0 }} />
)});
