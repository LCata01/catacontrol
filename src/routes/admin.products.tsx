import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/CrudTable";

export const Route = createFileRoute("/admin/products")({ component: () => (
  <CrudTable table="products" title="Products" fields={[
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price", type: "number" },
    { key: "cost", label: "Cost", type: "number" },
    { key: "stock", label: "Stock", type: "number" },
    { key: "active", label: "Active", type: "checkbox" },
  ]} defaults={{ active: true, price: 0 }} />
)});
