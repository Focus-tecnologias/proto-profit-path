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
  AlertTriangle,
  Boxes,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { HudCard } from "@/components/HudCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  money,
  uploadProductPhoto,
  useDeleteProduct,
  useProductPhotoUrls,
  useProducts,
  useSettings,
  useUpsertProduct,
  type Product,
} from "@/lib/farm";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Catálogo de Produtos — Focus Lab" },
      {
        name: "description",
        content:
          "Cadastre produtos prontos para venda, gerencie estoque mínimo e precificação.",
      },
      { property: "og:title", content: "Catálogo de Produtos — Focus Lab" },
      {
        property: "og:description",
        content: "Cadastre produtos prontos para venda, gerencie estoque mínimo e precificação.",
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
  color_hex: "#ff6600",
  cost_price: 0,
  sale_price: 0,
  quantity: 0,
  min_quantity: 5,
  image_path: null as string | null,
};

function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const upsert = useUpsertProduct();
  const remove = useDeleteProduct();

  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: photoUrls = {} } = useProductPhotoUrls(products.map((p) => p.image_path));

  async function handleUpload(file: File, product?: Product) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }
    setUploading(product?.id ?? "new");
    try {
      const path = await uploadProductPhoto(file);
      if (product) {
        await upsert.mutateAsync({ id: product.id, patch: { image_path: path } });
      } else {
        setForm((f) => ({ ...f, image_path: path }));
        setPreview(URL.createObjectURL(file));
      }
      toast.success("Foto enviada com sucesso.");
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setUploading(null);
    }
  }

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
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Produto cadastrado com sucesso.");
  }

  async function changeQty(p: Product, delta: number) {
    const quantity = Math.max(0, Number(p.quantity) + delta);
    await upsert.mutateAsync({ id: p.id, patch: { quantity } });
  }

  return (
    <AppShell
      title="Catálogo de Produtos"
      subtitle="Cadastre produtos prontos para venda, gerencie estoque mínimo e precificação."
      icon={Package}
    >
      {/* Top Metrics Strip */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total de produtos
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-white/5 text-white">
              <Package className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {products.length} <span className="text-lg font-normal text-muted-foreground">itens</span>
          </p>
          <span className="text-xs text-muted-foreground">Cadastrados no catálogo</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Unidades em estoque
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#ff6600]/10 text-primary">
              <Boxes className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#ff6600]">
            {totals.units} <span className="text-lg font-normal text-muted-foreground">unidades</span>
          </p>
          <span className="text-xs text-muted-foreground">Prontas para envio</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Valor em estoque
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Tag className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-400">
            {money(totals.value, currency)}
          </p>
          <span className="text-xs text-muted-foreground">Preço de venda projetado</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Estoque baixo
            </span>
            <div className={`flex size-8 items-center justify-center rounded-xl ${totals.low > 0 ? "bg-red-500/10 text-red-400" : "bg-white/5 text-muted-foreground"}`}>
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${totals.low > 0 ? "text-red-400" : "text-white"}`}>
            {totals.low} <span className="text-lg font-normal text-muted-foreground">{totals.low === 1 ? "produto" : "produtos"}</span>
          </p>
          <span className="text-xs text-muted-foreground">Abaixo da quantidade mínima</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Form: Register Hardware (5 Cols) */}
        <section className="space-y-4 lg:col-span-5">
          <HudCard
            tag="NOVO ITEM"
            title="Novo produto"
            icon={Package}
          >
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="pname" className="text-xs font-medium text-muted-foreground">
                  Nome do produto
                </Label>
                <Input
                  id="pname"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Suporte Articulado para Celular"
                  className="apple-input h-10 rounded-xl"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sku" className="text-xs font-medium text-muted-foreground">
                    Código SKU
                  </Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="PRD-001"
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat" className="text-xs font-medium text-muted-foreground">
                    Categoria
                  </Label>
                  <Input
                    id="cat"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Acessórios, Decoração…"
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cost" className="text-xs font-medium text-muted-foreground">
                    Custo de produção ({currency})
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) || 0 })}
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sale" className="text-xs font-medium text-muted-foreground">
                    Preço de venda ({currency})
                  </Label>
                  <Input
                    id="sale"
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) || 0 })}
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="qty" className="text-xs font-medium text-muted-foreground">
                    Estoque atual
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 0 })}
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min" className="text-xs font-medium text-muted-foreground">
                    Estoque mínimo
                  </Label>
                  <Input
                    id="min"
                    type="number"
                    min={0}
                    value={form.min_quantity}
                    onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) || 0 })}
                    className="apple-input h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-medium text-muted-foreground">
                  Descrição
                </Label>
                <Textarea
                  id="desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Material, especificações, instruções de acabamento…"
                  className="apple-input min-h-[70px] rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Label htmlFor="color" className="text-xs font-medium text-muted-foreground">
                  Cor
                </Label>
                <Input
                  id="color"
                  type="color"
                  value={form.color_hex}
                  onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                  className="h-10 w-14 rounded-xl border border-white/10 bg-black/40 p-1 cursor-pointer"
                />
                <span className="font-mono text-xs font-semibold uppercase text-white">{form.color_hex}</span>
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-muted-foreground">Foto do produto</Label>
                <div className="flex items-center gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                    {preview ? (
                      <img src={preview} alt="Pré-visualização" className="size-full object-cover" />
                    ) : (
                      <ImagePlus className="size-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-2 rounded-xl border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading === "new"}
                  >
                    {uploading === "new" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="size-3.5" />
                    )}
                    Selecionar foto
                  </Button>
                </div>
              </div>

              <Button
                className="orange-btn w-full gap-2 h-11 text-sm font-semibold mt-2"
                onClick={create}
                disabled={upsert.isPending}
              >
                <Plus className="size-4" /> Cadastrar produto
              </Button>
            </div>
          </HudCard>
        </section>

        {/* Right Product Grid & Search (7 Cols) */}
        <section className="space-y-4 lg:col-span-7">
          <HudCard
            tag="LISTAGEM"
            title="Produtos em catálogo"
            icon={Boxes}
          >
            <div className="mb-4 flex items-center gap-2 pt-1">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto por nome, SKU ou categoria…"
                className="apple-input h-10 rounded-xl"
              />
            </div>

            {isLoading ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Carregando catálogo de produtos…
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Nenhum produto encontrado no catálogo.
              </p>
            ) : (
              <ul className="space-y-3">
                {filtered.map((p) => {
                  const isLow = Number(p.quantity) <= Number(p.min_quantity);
                  return (
                    <li
                      key={p.id}
                      className={`rounded-2xl border p-4 transition-all duration-200 ${
                        isLow
                          ? "border-red-500/40 bg-red-950/15"
                          : "border-white/5 bg-[#14151b]/70 hover:border-white/15"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <ProductPhoto
                            product={p}
                            url={p.image_path ? photoUrls[p.image_path] : undefined}
                            busy={uploading === p.id}
                            onPick={(file) => void handleUpload(file, p)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="size-3 rounded-full border border-white/20 shadow-sm"
                                style={{ backgroundColor: p.color_hex }}
                              />
                              <h4 className="text-sm font-semibold text-white">
                                {p.name}
                              </h4>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              SKU: {p.sku || "N/A"} · Categoria: {p.category || "Geral"}
                            </p>
                            {p.description && (
                              <p className="mt-1 text-xs text-muted-foreground/80">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-semibold text-primary">
                            {money(Number(p.sale_price), currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Custo: {money(Number(p.cost_price), currency)}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
                            onClick={() => changeQty(p, -1)}
                            aria-label="Diminuir unidade"
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-10 text-center font-mono text-sm font-semibold text-white">
                            {p.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
                            onClick={() => changeQty(p, 1)}
                            aria-label="Adicionar unidade"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                          <span className="text-xs text-muted-foreground font-medium ml-1">
                            Mín: {p.min_quantity}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isLow && (
                            <span className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                              <AlertTriangle className="size-3" /> Estoque baixo
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            onClick={() => remove.mutate(p.id)}
                            aria-label="Excluir produto"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </HudCard>
        </section>
      </div>
    </AppShell>
  );
}

function ProductPhoto({
  product,
  url,
  busy,
  onPick,
}: {
  product: Product;
  url?: string | undefined;
  busy: boolean;
  onPick: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className="group relative size-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 hover:border-primary/50 transition-colors"
      aria-label={`Enviar foto de ${product.name}`}
    >
      {url ? (
        <img src={url} alt={product.name} className="size-full object-cover transition-transform group-hover:scale-105" />
      ) : (
        <span className="flex size-full items-center justify-center">
          <ImagePlus className="size-4 text-muted-foreground/60" />
        </span>
      )}
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/80">
          <Loader2 className="size-4 animate-spin text-primary" />
        </span>
      ) : null}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
