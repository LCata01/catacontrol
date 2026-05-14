import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { TenantProvider } from "@/lib/tenant-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold tracking-tight">404</h1>
        <p className="mt-4 text-muted-foreground">Page not found.</p>
        <a href="/" className="mt-6 inline-block rounded-md bg-primary px-5 py-3 text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-5 py-3 text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { title: "CATA CONTROL" },
      { name: "description", content: "Manejo total para boliches" },
      { name: "theme-color", content: "#000000" },
      { property: "og:title", content: "CATA CONTROL" },
      { name: "twitter:title", content: "CATA CONTROL" },
      { property: "og:description", content: "Manejo total para boliches" },
      { name: "twitter:description", content: "Manejo total para boliches" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/982e46d5-bc66-4f3c-bda8-72554d06c26f/id-preview-b0be6985--31115e20-dfe2-4985-a93a-113676f8c14b.lovable.app-1778727229652.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/982e46d5-bc66-4f3c-bda8-72554d06c26f/id-preview-b0be6985--31115e20-dfe2-4985-a93a-113676f8c14b.lovable.app-1778727229652.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <Outlet />
          <Toaster theme="dark" position="top-center" richColors />
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
