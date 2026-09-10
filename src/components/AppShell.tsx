import { Link } from "@tanstack/react-router";
import {
  Calculator,
  LayoutDashboard,
  ListOrdered,
  Boxes,
  Package,
  Activity,
  Printer as PrinterIcon,
  PieChart,
  PanelLeftClose,
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
  { to: "/operations", label: "Operacional", icon: Activity },
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
    <div className="min-h-screen md:pl-60">
      <aside className="border-border bg-sidebar fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r md:flex">
        <div className="flex h-20 items-center border-b border-border px-5">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo.url} alt="Fabruca" className="h-8 w-auto" />
            <div>
              <span className="block text-sm font-bold uppercase text-foreground">Fabruca</span>
              <span className="label-tag block text-[9px] text-primary">Production OS</span>
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
          <p className="label-tag px-3 pb-2 text-[9px]">Central de controle</p>
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{
                  className: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                }}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-md bg-background/60 px-3 py-3">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-accent opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-accent" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Sistema operacional</p>
              <p className="text-[10px] text-muted-foreground">Sincronização ativa</p>
            </div>
            <PanelLeftClose className="size-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur md:hidden">
        <div className="flex items-center gap-4 overflow-x-auto px-4 py-3">
          <Link to="/" className="shrink-0"><img src={logo.url} alt="Fabruca" className="h-7 w-auto" /></Link>
          <nav className="flex gap-1">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground" activeProps={{ className: "bg-primary/10 text-primary" }}>
                <item.icon className="size-4" /><span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 lg:px-10">
        <div className="mb-7 border-b border-border pb-5">
          <p className="label-tag mb-2 text-primary">Fabruca / Operação</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
