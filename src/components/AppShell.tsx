import { Link } from "@tanstack/react-router";
import {
  Calculator,
  LayoutDashboard,
  ListOrdered,
  Boxes,
  Package,
  Printer as PrinterIcon,
  PieChart,
} from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/focus-logo.png.asset.json";

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/estimator", label: "Orçamento", icon: Calculator },
  { to: "/queue", label: "Fila", icon: ListOrdered },
  { to: "/inventory", label: "Filamento", icon: Boxes },
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/printers", label: "Impressoras", icon: PrinterIcon },
  { to: "/revenue", label: "Receita", icon: PieChart },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo.url} alt="Focus" className="h-7 w-auto" />
            <span className="hidden text-sm font-semibold tracking-tight sm:block">
              PrintHub<span className="text-primary"> Manager</span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{
                  className: "bg-primary/12 text-primary hover:bg-primary/12 hover:text-primary",
                }}
              >
                <item.icon className="size-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
