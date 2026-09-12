import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calculator,
  LayoutDashboard,
  ListOrdered,
  Boxes,
  Package,
  Activity,
  Printer as PrinterIcon,
  PieChart,
  ChevronDown,
  FileText,
  Truck,
  Settings,
  Menu,
  X,
  ShoppingBag,
} from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import brandLogo from "@/assets/focus-lab-logo-cropped.png";
import { SettingsModal } from "./SettingsModal";

type SubItem = {
  to: string;
  label: string;
  description: string;
  icon: React.ElementType;
};

type NavCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  to: string;
  routes: string[];
  subItems: SubItem[];
};

const navCategories: NavCategory[] = [
  {
    id: "painel",
    label: "Painel",
    icon: LayoutDashboard,
    to: "/",
    routes: ["/"],
    subItems: [
      {
        to: "/",
        label: "Painel da Fábrica",
        description: "Visão geral consolidada, telemetria e KPIs",
        icon: LayoutDashboard,
      },
      {
        to: "/",
        label: "Chão de Fábrica ao Vivo",
        description: "Monitoramento em tempo real das impressoras",
        icon: Activity,
      },
      {
        to: "/products",
        label: "Estoque de Produtos Prontos",
        description: "Peças acabadas prontas para entrega a fornecedores",
        icon: Truck,
      },
    ],
  },
  {
    id: "orcamento",
    label: "Orçamento",
    icon: Calculator,
    to: "/estimator",
    routes: ["/estimator", "/orders"],
    subItems: [
      {
        to: "/estimator",
        label: "Orçamento Comercial",
        description: "Cálculo preciso de custos de manufatura e precificação",
        icon: Calculator,
      },
      {
        to: "/orders",
        label: "Ordens de Pedidos",
        description: "Triagem técnica, aprovação, reprovações e produção",
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    icon: Activity,
    to: "/operations",
    routes: ["/operations", "/printers", "/queue"],
    subItems: [
      {
        to: "/operations",
        label: "Controle Operacional",
        description: "Sessões ativas, cronômetros ao vivo e equipe",
        icon: Activity,
      },
      {
        to: "/printers",
        label: "Parque de Impressoras",
        description: "Gestão do parque de máquinas e status",
        icon: PrinterIcon,
      },
      {
        to: "/queue",
        label: "Fila de Produção",
        description: "Gestão e prioridades de ordens de serviço",
        icon: ListOrdered,
      },
    ],
  },
  {
    id: "estoque",
    label: "Estoque",
    icon: Boxes,
    to: "/products",
    routes: ["/products", "/inventory"],
    subItems: [
      {
        to: "/products",
        label: "Catálogo de Produtos",
        description: "Peças acabadas, controle de SKUs e lotes",
        icon: Package,
      },
      {
        to: "/inventory",
        label: "Estoque de Filamentos",
        description: "Bobinas ativas, pesagem e custos por kg",
        icon: Boxes,
      },
    ],
  },
  {
    id: "receita",
    label: "Receita",
    icon: PieChart,
    to: "/revenue",
    routes: ["/revenue"],
    subItems: [
      {
        to: "/revenue",
        label: "Divisão de Receitas",
        description: "Balanço financeiro e distribuição societária",
        icon: PieChart,
      },
    ],
  },
];

export function AppShell({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: ReactNode;
}) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveMenu(id);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 200);
  };

  // Close menus on path change
  useEffect(() => {
    setActiveMenu(null);
    setMobileOpen(false);
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-black text-foreground antialiased flex flex-col">
      {/* Top Fixed Glass Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#07080b]/90 backdrop-blur-2xl transition-all pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 sm:h-16 max-w-[1600px] items-center justify-between px-3.5 sm:px-6 lg:px-8">
          
          {/* Left: Brand Logo */}
          <div className="flex items-center min-w-[140px] sm:min-w-[200px]">
            <Link to="/" className="group flex items-center transition-all duration-200 hover:opacity-95 py-1">
              <img
                src={brandLogo}
                alt="Focus Lab"
                className="h-7.5 sm:h-9 md:h-10 max-h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </Link>
          </div>

          {/* Center: Desktop Categories Navbar (Glass Pill with subtle rounding) */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <nav
              className="flex items-center gap-1 bg-[#101118]/85 backdrop-blur-xl border border-white/[0.09] p-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              onMouseLeave={handleMouseLeave}
            >
              {navCategories.map((cat) => {
                const isActive = cat.routes.includes(currentPath);
                const isOpen = activeMenu === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter(cat.id)}
                  >
                    <Link
                      to={cat.to}
                      onClick={() => setActiveMenu((prev) => (prev === cat.id ? null : cat.id))}
                      className={`group flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-white/[0.08] text-white border border-white/[0.12] shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
                      }`}
                    >
                      <span className={isActive ? "text-[#ff6600] font-bold" : ""}>{cat.label}</span>
                      <ChevronDown
                        className={`size-3 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-primary" : "text-zinc-500 group-hover:text-zinc-400"
                        }`}
                      />
                    </Link>

                    {/* Dropdown Hover / Click Submenu */}
                    {isOpen && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl border border-white/10 bg-[#0d0e14]/95 p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50"
                        onMouseEnter={() => handleMouseEnter(cat.id)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="px-3 py-1.5 border-b border-white/5 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {cat.label} — Módulos
                          </span>
                        </div>
                        <div className="space-y-1">
                          {cat.subItems.map((sub, idx) => (
                            <Link
                              key={idx}
                              to={sub.to}
                              onClick={() => setActiveMenu(null)}
                              className="group flex items-start gap-3 p-2.5 rounded-lg transition-all duration-150 hover:bg-white/[0.06]"
                            >
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/15 group-hover:text-primary transition-colors">
                                <sub.icon className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white group-hover:text-primary transition-colors">
                                  {sub.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {sub.description}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right: User Profile, PRO Tag & Settings */}
          <div className="flex items-center justify-end min-w-[120px] sm:min-w-[200px] gap-2 sm:gap-2.5">
            <div className="hidden sm:flex items-center gap-2.5">
              <span className="rounded-md border border-[#ff6600]/60 bg-[#ff6600]/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#ff6600] uppercase shadow-[0_0_10px_rgba(255,102,0,0.15)]">
                PRO
              </span>
              <div
                className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-[#12131a] overflow-hidden hover:border-primary/60 transition-all cursor-pointer shadow-sm"
                title="Perfil do Usuário (Admin)"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                  alt="Perfil"
                  className="size-full object-cover"
                />
              </div>

              {/* Minimalist frameless clean gear icon */}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Configurações do Sistema"
                className="flex size-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white transition-all duration-300 hover:rotate-90 active:scale-95 focus:outline-none"
                aria-label="Configurações do Sistema"
              >
                <Settings className="size-5 stroke-[1.75]" />
              </button>
            </div>

            {/* Mobile Settings + Hamburger Toggle */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Configurações do Sistema"
                className="flex size-10 items-center justify-center rounded-lg text-zinc-400 hover:text-white active:bg-white/10 transition-colors"
                aria-label="Configurações do Sistema"
              >
                <Settings className="size-5 stroke-[1.75]" />
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white active:bg-white/15 transition-all active:scale-95"
                aria-label="Abrir menu"
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Expandable Menu */}
        {mobileOpen && (
          <div className="border-b border-white/10 bg-[#0a0b10]/98 backdrop-blur-3xl px-4 py-4 md:hidden animate-in slide-in-from-top-3 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
            <div className="space-y-4">
              {navCategories.map((cat) => {
                const isActive = cat.routes.includes(currentPath);
                return (
                  <div key={cat.id} className="space-y-1.5 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between">
                      <Link
                        to={cat.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2 py-1 text-xs font-bold uppercase tracking-wider ${
                          isActive ? "text-primary" : "text-zinc-300"
                        }`}
                      >
                        <span>{cat.label}</span>
                      </Link>
                    </div>
                    <div className="grid gap-1 pl-1">
                      {cat.subItems.map((sub, idx) => (
                        <Link
                          key={idx}
                          to={sub.to}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 py-2.5 px-2.5 rounded-lg text-xs text-muted-foreground active:text-white active:bg-white/10 hover:text-white hover:bg-white/5 transition-colors min-h-[40px]"
                        >
                          <sub.icon className="size-4 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-white block">{sub.label}</span>
                            <span className="text-[10px] text-zinc-400 block line-clamp-1">{sub.description}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8 pb-[calc(env(safe-area-inset-bottom,20px)+24px)]">
        <div className="mb-8 flex flex-col justify-between gap-3 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {children}
      </main>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

