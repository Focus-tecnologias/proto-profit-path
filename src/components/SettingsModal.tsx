import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  Sliders,
  Bell,
  Save,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export interface SystemSettings {
  companyName: string;
  tradingName: string;
  cnpj: string;
  whatsapp: string;
  email: string;
  city: string;
  pixKey: string;
  defaultEnergyKwh: number;
  defaultOperatorHourlyRate: number;
  defaultProfitMargin: number;
  defaultFailureRate: number;
  defaultMachineDepreciationPerHour: number;
  enableSoundAlerts: boolean;
  enableLowStockAlerts: boolean;
  autoSaveEstimates: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  companyName: "Focus Lab 3D Manufatura",
  tradingName: "Focus Lab 3D",
  cnpj: "00.000.000/0001-00",
  whatsapp: "+55 (11) 98765-4321",
  email: "contato@focuslab3d.com.br",
  city: "São Paulo - SP",
  pixKey: "financeiro@focuslab3d.com.br",
  defaultEnergyKwh: 0.95,
  defaultOperatorHourlyRate: 25.0,
  defaultProfitMargin: 40.0,
  defaultFailureRate: 5.0,
  defaultMachineDepreciationPerHour: 1.5,
  enableSoundAlerts: true,
  enableLowStockAlerts: true,
  autoSaveEstimates: true,
};

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem("focus_lab_system_settings");
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setSavedSuccess(false);
      try {
        const saved = localStorage.getItem("focus_lab_system_settings");
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch {
        // fallback
      }
    }
  }, [open]);

  const handleSave = () => {
    try {
      localStorage.setItem(
        "focus_lab_system_settings",
        JSON.stringify(settings)
      );
      setSavedSuccess(true);
      toast.success("Configurações salvas com sucesso!");
      setTimeout(() => {
        onOpenChange(false);
        setSavedSuccess(false);
      }, 600);
    } catch {
      toast.error("Erro ao salvar configurações.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:max-w-2xl border border-white/10 bg-[#0d0e15] text-white backdrop-blur-2xl p-0 overflow-hidden rounded-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3.5 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div className="space-y-1">
            <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="size-4.5 sm:size-5 text-primary" />
              Configurações do Sistema & Fábrica
            </DialogTitle>
            <DialogDescription className="text-[11px] sm:text-xs text-zinc-400">
              Gerencie os dados institucionais, parâmetros de custo de manufatura e preferências operacionais.
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs defaultValue="empresa" className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 pt-2.5 sm:pt-3 border-b border-white/5 bg-black/20 shrink-0">
            <TabsList className="grid grid-cols-3 bg-white/5 border border-white/10 p-1 rounded-xl h-auto min-h-9">
              <TabsTrigger
                value="empresa"
                className="text-[10.5px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-white font-medium rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 py-1.5"
              >
                <Building2 className="size-3 sm:size-3.5 shrink-0" />
                <span className="truncate">Empresa</span>
              </TabsTrigger>
              <TabsTrigger
                value="parametros"
                className="text-[10.5px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-white font-medium rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 py-1.5"
              >
                <Zap className="size-3 sm:size-3.5 shrink-0" />
                <span className="truncate">Custos</span>
              </TabsTrigger>
              <TabsTrigger
                value="sistema"
                className="text-[10.5px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-white font-medium rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 py-1.5"
              >
                <Bell className="size-3 sm:size-3.5 shrink-0" />
                <span className="truncate">Alertas</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* ABA 1: EMPRESA */}
            <TabsContent value="empresa" className="space-y-4 m-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    Nome Fantasia
                  </Label>
                  <Input
                    value={settings.tradingName}
                    onChange={(e) =>
                      setSettings({ ...settings, tradingName: e.target.value })
                    }
                    placeholder="Focus Lab 3D"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    Razão Social
                  </Label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) =>
                      setSettings({ ...settings, companyName: e.target.value })
                    }
                    placeholder="Focus Lab Manufatura Aditiva LTDA"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    CNPJ / Documento
                  </Label>
                  <Input
                    value={settings.cnpj}
                    onChange={(e) =>
                      setSettings({ ...settings, cnpj: e.target.value })
                    }
                    placeholder="00.000.000/0001-00"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9 text-xs rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    WhatsApp Comercial
                  </Label>
                  <Input
                    value={settings.whatsapp}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: e.target.value })
                    }
                    placeholder="+55 (11) 98765-4321"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    E-mail Oficial
                  </Label>
                  <Input
                    value={settings.email}
                    onChange={(e) =>
                      setSettings({ ...settings, email: e.target.value })
                    }
                    placeholder="contato@focuslab3d.com.br"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    Cidade / UF
                  </Label>
                  <Input
                    value={settings.city}
                    onChange={(e) =>
                      setSettings({ ...settings, city: e.target.value })
                    }
                    placeholder="São Paulo - SP"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <Label className="text-xs text-zinc-300 font-medium">
                  Chave PIX Padrão (Exibida em Orçamentos Gerados)
                </Label>
                <Input
                  value={settings.pixKey}
                  onChange={(e) =>
                    setSettings({ ...settings, pixKey: e.target.value })
                  }
                  placeholder="financeiro@focuslab3d.com.br"
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9 text-xs rounded-lg font-mono"
                />
              </div>
            </TabsContent>

            {/* ABA 2: PARÂMETROS */}
            <TabsContent value="parametros" className="space-y-4 m-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    Custo de Energia Padrão (R$ / kWh)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.defaultEnergyKwh}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultEnergyKwh: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white focus-visible:ring-primary h-9 text-xs rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    Custo Hora Operador (R$ / hora)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.defaultOperatorHourlyRate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultOperatorHourlyRate:
                          parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white focus-visible:ring-primary h-9 text-xs rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    Margem de Lucro Padrão Sugerida (%)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    value={settings.defaultProfitMargin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultProfitMargin: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white focus-visible:ring-primary h-9 text-xs rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-medium">
                    Taxa de Falha / Risco Padrão (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.defaultFailureRate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultFailureRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white focus-visible:ring-primary h-9 text-xs rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <Label className="text-xs text-zinc-300 font-medium">
                  Depreciação de Máquina Sugerida (R$ / hora de impressão)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.defaultMachineDepreciationPerHour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultMachineDepreciationPerHour:
                        parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-white/5 border-white/10 text-white focus-visible:ring-primary h-9 text-xs rounded-lg font-mono"
                />
              </div>
            </TabsContent>

            {/* ABA 3: SISTEMA & ALERTAS */}
            <TabsContent value="sistema" className="space-y-4 m-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">
                      Alertas Sonoros de Impressão
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Tocar som quando um job for concluído ou pausado na fila.
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableSoundAlerts}
                    onCheckedChange={(val) =>
                      setSettings({ ...settings, enableSoundAlerts: val })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">
                      Alerta de Baixo Estoque de Filamento
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Destacar em vermelho quando um carretel tiver menos de 150g disponíveis.
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableLowStockAlerts}
                    onCheckedChange={(val) =>
                      setSettings({ ...settings, enableLowStockAlerts: val })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">
                      Auto-salvamento de Rascunhos de Orçamento
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Preservar automaticamente os parâmetros da cotação comercial em andamento.
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSaveEstimates}
                    onCheckedChange={(val) =>
                      setSettings({ ...settings, autoSaveEstimates: val })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </div>

          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0 pb-[calc(env(safe-area-inset-bottom,12px)+12px)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 active:bg-white/10 text-xs rounded-xl h-9 px-4"
            >
              Cancelar
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 px-5 h-9 active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Salvo!
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
