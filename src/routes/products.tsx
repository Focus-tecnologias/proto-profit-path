import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  money,
  useDeleteProduct,
  useProducts,
  useSettings,
  useUpsertProduct,
  type Product,
} from "@/lib/farm";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Estoque de Produtos — PrintHub Manager" },
      {
        name: "description",
        content:
          "Controle o estoque de produtos impressos: quantidade, custo, preço de venda e alertas de estoque baixo.",
      },
      { property: "og:title", content: "Estoque de Produtos — PrintHub Manager" },
      {
        property: "og:description",
        content: "Cadastre produtos, acompanhe quantidades e receba alertas de estoque baixo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

const EMPTY = {
  name: "",
  sku: "",
  category: "",
  description: "",
  color_hex: "#22d3ee",
  cost_price: 0,
  sale_price: 0,
  quantity: 0,
  min_quantity: 5,
};

function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const upsert = useUpsertProduct();
  const remove = useDeleteProduct();

  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.category].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [products, search]);

  const totals = useMemo(() => {
    const units = products.reduce((s, p) => s + Number(p.quantity), 0);
    const cost = products.reduce((s, p) => s + Number(p.quantity) * Number(p.cost_price), 0);
    const value = products.reduce((s, p) => s + Number(p.quantity) * Number(p.sale_price), 0);
    const low = products.filter((p) => Number(p.quantity) <= Number(p.min_quantity)).length;
    return { units, cost, value, low };
  }, [products]);

  async function create() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    await upsert.mutateAsync({ patch: { ...form, name: form.name.trim() } });
    setForm({ ...EMPTY });
    toast.success("Produto cadastrado no estoque.");
  }

  async function changeQty(p: Product, delta: number) {
    const quantity = Math.max(0, Number(p.quantity) + delta);
    await upsert.mutateAsync({ id: p.id, patch: { quantity } });
  }

  return (
    <AppShell
      title="Estoque de Produtos"
      subtitle="Cadastre os produtos acabados, acompanhe quantidades, custos e alertas de reposição."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Produtos" value={String(products.length)} />
        <Stat label="Unidades em estoque" value={String(totals.units)} />
        <Stat label="Valor de venda" value={money(totals.value, currency)} />
        <Stat
          label="Estoque baixo"
          value={String(totals.low)}
          className={totals.low ? "text-rose-accent" : ""}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel space-y-4 p-6 lg:col-span-2">
          <div className="label-tag flex items-center gap-2">
            <Package className="size-3.5" /> Novo produto
          </div>

          <div className="space-y-2">
            <Label htmlFor="pname">Nome</Label>
            <Input
              id="pname"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Suporte de headset"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="SUP-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat">Categoria</Label>
              <Input
                id="cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Acessórios"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Custo ({currency})</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                step={0.5}
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale">Preço de venda ({currency})</Label>
              <Input
                id="sale"
                type="number"
                min={0}
                step={0.5}
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantidade</Label>
              <Input
                id="qty"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min">Estoque mínimo</Label>
              <Input
                id="min"
                type="number"
                min={0}
                value={form.min_quantity}
                onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea
              id="desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes, cor, acabamento…"
            />
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="color" className="text-xs text-muted-foreground">
              Cor de identificação
            </Label>
            <Input
              id="color"
              type="color"
              value={form.color_hex}
              onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
              className="h-10 w-16 p-1"
            />
          </div>

          <Button className="w-full" onClick={create} disabled={upsert.isPending}>
            <Plus className="size-4" /> Cadastrar produto
          </Button>
        </section>

        <section className="panel p-6 lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, SKU ou categoria"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando produtos…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto encontrado. Cadastre o primeiro ao lado.
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((p) => {
                const low = Number(p.quantity) <= Number(p.min_quantity);
                return (
                  <li
                    key={p.id}
                    className="rounded-lg border border-border bg-surface-raised p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 size-3.5 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: p.color_hex }}
                        />
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="label-tag mt-0.5">
                            {[p.sku, p.category].filter(Boolean).join(" · ") || "Sem SKU"}
                          </p>
                          {p.description ? (
                            <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="num font-semibold">
                          {money(Number(p.sale_price), currency)}
                        </p>
                        <p className="label-tag">
                          custo {money(Number(p.cost_price), currency)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => changeQty(p, -1)}
                          aria-label="Remover uma unidade"
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="num w-14 text-center text-lg font-semibold">
                          {p.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => changeQty(p, 1)}
                          aria-label="Adicionar uma unidade"
                        >
                          <Plus className="size-4" />
                        </Button>
                        <span className="label-tag">mín. {p.min_quantity}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {low ? (
                          <span className="flex items-center gap-1 rounded-md border border-rose-accent/30 bg-rose-accent/10 px-2 py-1 text-xs text-rose-accent">
                            <TriangleAlert className="size-3.5" /> Estoque baixo
                          </span>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove.mutate(p.id)}
                          aria-label="Excluir produto"
                        >
                          <Trash2 className="size-4 text-rose-accent" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="label-tag">{label}</p>
      <p className={`num mt-1 text-2xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}
