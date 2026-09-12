import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Layers, AlertTriangle, Coins, Boxes } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { HudCard } from "@/components/HudCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, useDeleteFilament, useFilaments, useSettings, useUpsertFilament } from "@/lib/farm";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Estoque de Filamentos — Focus Lab" },
      {
        name: "description",
        content:
          "Monitore o peso restante de cada bobina, custos por kg e receba alertas de estoque baixo.",
      },
      { property: "og:title", content: "Estoque de Filamentos — Focus Lab" },
      {
        property: "og:description",
        content: "Monitore o peso restante de cada bobina, custos por kg e receba alertas de estoque baixo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inventory,
});

const empty = {
  material: "PLA",
  brand: "Standard Specs",
  color_hex: "#ff6600",
  spool_weight_g: 1000,
  cost_per_kg: 120,
  remaining_g: 1000,
};

function Inventory() {
  const { data: filaments = [] } = useFilaments();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const upsert = useUpsertFilament();
  const remove = useDeleteFilament();
  const [form, setForm] = useState(empty);

  const set = (k: keyof typeof empty, v: string | number) => setForm({ ...form, [k]: v });

  const totalGrams = filaments.reduce((acc, f) => acc + Number(f.remaining_g), 0);
  const totalKg = (totalGrams / 1000).toFixed(2);
  const totalValue = filaments.reduce(
    (acc, f) => acc + (Number(f.remaining_g) / 1000) * Number(f.cost_per_kg),
    0,
  );
  const lowCount = filaments.filter(
    (f) => (Number(f.remaining_g) / Math.max(1, Number(f.spool_weight_g))) * 100 < 20,
  ).length;

  return (
    <AppShell
      title="Estoque de Filamentos"
      subtitle="Monitore o peso restante de cada bobina, custos por kg e receba alertas de estoque baixo."
      icon={Boxes}
    >
      {/* Top Metric Tiles */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total em estoque
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#ff6600]/10 text-primary">
              <Layers className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {totalKg} <span className="text-lg font-normal text-muted-foreground">kg</span>
          </p>
          <span className="text-xs text-muted-foreground">{filaments.length} bobinas cadastradas</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Valor do estoque
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Coins className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {money(totalValue, currency)}
          </p>
          <span className="text-xs text-muted-foreground">Custo total de matéria-prima</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Alertas de reposição
            </span>
            <div className={`flex size-8 items-center justify-center rounded-xl ${lowCount > 0 ? "bg-red-500/10 text-red-400" : "bg-white/5 text-muted-foreground"}`}>
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${lowCount > 0 ? "text-red-400" : "text-white"}`}>
            {lowCount} <span className="text-lg font-normal text-muted-foreground">{lowCount === 1 ? "bobina baixa" : "bobinas baixas"}</span>
          </p>
          <span className="text-xs text-muted-foreground">Abaixo de 20% do volume inicial</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Register Spool */}
        <section className="space-y-4 lg:col-span-5">
          <HudCard
            tag="CADASTRO"
            title="Cadastrar bobina"
            icon={Plus}
          >
            <div className="space-y-4 pt-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mat" className="text-xs font-medium text-muted-foreground">
                    Material
                  </Label>
                  <Input
                    id="mat"
                    value={form.material}
                    onChange={(e) => set("material", e.target.value)}
                    placeholder="PLA, PETG, ABS, TPU…"
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="brand" className="text-xs font-medium text-muted-foreground">
                    Marca / Fabricante
                  </Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="Ex: Polymaker, 3D Fila"
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cost" className="text-xs font-medium text-muted-foreground">
                    Custo por kg ({currency})
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    min={0}
                    value={form.cost_per_kg}
                    onChange={(e) => set("cost_per_kg", Number(e.target.value) || 0)}
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rem" className="text-xs font-medium text-muted-foreground">
                    Restante (g)
                  </Label>
                  <Input
                    id="rem"
                    type="number"
                    min={0}
                    value={form.remaining_g}
                    onChange={(e) => set("remaining_g", Number(e.target.value) || 0)}
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="spool" className="text-xs font-medium text-muted-foreground">
                    Peso total da bobina (g)
                  </Label>
                  <Input
                    id="spool"
                    type="number"
                    min={0}
                    value={form.spool_weight_g}
                    onChange={(e) => set("spool_weight_g", Number(e.target.value) || 0)}
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="color" className="text-xs font-medium text-muted-foreground">
                    Cor
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <Input
                      id="color"
                      type="color"
                      className="h-10 w-14 rounded-xl border border-white/10 bg-black/40 p-1 cursor-pointer"
                      value={form.color_hex}
                      onChange={(e) => set("color_hex", e.target.value)}
                    />
                    <span className="font-mono text-xs font-semibold uppercase text-white">{form.color_hex}</span>
                  </div>
                </div>
              </div>

              <Button
                className="orange-btn w-full gap-2 h-11 text-sm font-semibold mt-2"
                onClick={async () => {
                  if (!form.material.trim()) {
                    toast.error("Informe o material.");
                    return;
                  }
                  await upsert.mutateAsync({ patch: form });
                  toast.success("Bobina cadastrada com sucesso.");
                  setForm(empty);
                }}
                disabled={upsert.isPending}
              >
                <Plus className="size-4" /> Cadastrar bobina
              </Button>
            </div>
          </HudCard>
        </section>

        {/* Right Spool List */}
        <section className="space-y-4 lg:col-span-7">
          <HudCard
            tag="ESTOQUE"
            title="Bobinas em estoque"
            icon={Layers}
          >
            <ul className="space-y-3 pt-1">
              {filaments.map((f) => {
                const pct = Math.min(
                  100,
                  Math.round((Number(f.remaining_g) / Math.max(1, Number(f.spool_weight_g))) * 100),
                );
                const isLow = pct < 20;

                return (
                  <li
                    key={f.id}
                    className={`rounded-2xl border p-4 transition-all duration-200 ${
                      isLow
                        ? "border-red-500/40 bg-red-950/15"
                        : "border-white/5 bg-[#14151b]/70 hover:border-white/15"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="size-4 rounded-full border border-white/20 shadow-sm shrink-0"
                          style={{ backgroundColor: f.color_hex }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {f.material} · {f.brand}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {money(Number(f.cost_per_kg), currency)}/kg · {f.remaining_g}g / {f.spool_weight_g}g
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Saldo:</span>
                          <Input
                            type="number"
                            className="h-8 w-20 rounded-lg border-white/10 bg-black/40 text-right font-mono text-xs font-semibold text-white"
                            value={Number(f.remaining_g)}
                            onChange={(e) =>
                              upsert.mutate({
                                id: f.id,
                                patch: { remaining_g: Number(e.target.value) || 0 },
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">g</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          onClick={() => {
                            remove.mutate(f.id);
                            toast.success("Bobina removida.");
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Level Gauge */}
                    <div className="mt-3.5">
                      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                        <span className="font-medium">Nível da bobina</span>
                        <span className={isLow ? "font-semibold text-red-400" : "font-semibold text-[#ff6600]"}>
                          {pct}% restante
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isLow ? "#ef4444" : f.color_hex || "#ff6600",
                          }}
                        />
                      </div>
                      {isLow && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          <span>Estoque baixo: providencie a reposição desta bobina em breve.</span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}

              {filaments.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-muted-foreground">
                  Nenhuma bobina cadastrada no estoque.
                </li>
              )}
            </ul>
          </HudCard>
        </section>
      </div>
    </AppShell>
  );
}
