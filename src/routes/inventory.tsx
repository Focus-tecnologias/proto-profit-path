import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, useDeleteFilament, useFilaments, useSettings, useUpsertFilament } from "@/lib/farm";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Estoque de Filamento — PrintHub Manager" },
      {
        name: "description",
        content:
          "Controle bobinas, materiais, custo por quilo e saldo restante do estoque de filamento.",
      },
      { property: "og:title", content: "Estoque de Filamento — PrintHub Manager" },
      {
        property: "og:description",
        content: "Bobinas, custo por quilo e saldo restante sempre atualizados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inventory,
});

const empty = {
  material: "PLA",
  brand: "",
  color_hex: "#22d3ee",
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

  return (
    <AppShell
      title="Estoque de Filamento"
      subtitle="Cada bobina, seu custo e quanto ainda resta para produzir."
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel h-fit space-y-4 p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Nova bobina</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mat">Material</Label>
              <Input
                id="mat"
                value={form.material}
                onChange={(e) => set("material", e.target.value)}
                placeholder="PLA, PETG, ABS…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="3D Fila"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Custo por kg ({currency})</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                value={form.cost_per_kg}
                onChange={(e) => set("cost_per_kg", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rem">Restante (g)</Label>
              <Input
                id="rem"
                type="number"
                min={0}
                value={form.remaining_g}
                onChange={(e) => set("remaining_g", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spool">Peso da bobina (g)</Label>
              <Input
                id="spool"
                type="number"
                min={0}
                value={form.spool_weight_g}
                onChange={(e) => set("spool_weight_g", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                type="color"
                className="h-9 p-1"
                value={form.color_hex}
                onChange={(e) => set("color_hex", e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              if (!form.material.trim()) {
                toast.error("Informe o material.");
                return;
              }
              await upsert.mutateAsync({ patch: form });
              toast.success("Bobina adicionada ao estoque.");
              setForm(empty);
            }}
            disabled={upsert.isPending}
          >
            <Plus className="size-4" /> Adicionar bobina
          </Button>
        </section>

        <section className="panel lg:col-span-3">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Bobinas cadastradas</h2>
          </header>
          <ul className="divide-y divide-border">
            {filaments.map((f) => {
              const pct = Math.min(
                100,
                (Number(f.remaining_g) / Math.max(1, Number(f.spool_weight_g))) * 100,
              );
              return (
                <li key={f.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="size-4 rounded-full border border-border"
                        style={{ backgroundColor: f.color_hex }}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {f.material} · {f.brand}
                        </p>
                        <p className="num text-xs text-muted-foreground">
                          {money(Number(f.cost_per_kg), currency)}/kg · {f.remaining_g} g restantes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        className="num w-24"
                        value={Number(f.remaining_g)}
                        onChange={(e) =>
                          upsert.mutate({
                            id: f.id,
                            patch: { remaining_g: Number(e.target.value) || 0 },
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-accent hover:text-rose-accent"
                        onClick={() => {
                          remove.mutate(f.id);
                          toast.success("Bobina removida.");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: f.color_hex }}
                    />
                  </div>
                  {pct < 15 ? (
                    <p className="mt-2 text-xs text-rose-accent">
                      Estoque baixo — reponha esta bobina.
                    </p>
                  ) : null}
                </li>
              );
            })}
            {filaments.length === 0 ? (
              <li className="px-5 py-10 text-sm text-muted-foreground">
                Nenhuma bobina cadastrada ainda.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
