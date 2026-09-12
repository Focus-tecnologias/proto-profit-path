import { type ReactNode } from "react";

interface HudCardProps {
  title?: ReactNode;
  tag?: string;
  badge?: ReactNode;
  icon?: React.ElementType;
  className?: string;
  glow?: "cyan" | "red" | "emerald" | "amber" | "orange" | "none";
  children: ReactNode;
}

export function HudCard({
  title,
  tag,
  badge,
  icon: Icon,
  className = "",
  glow = "none",
  children,
}: HudCardProps) {
  const glowClass =
    glow === "orange"
      ? "hover:border-primary/40 hover:shadow-[0_0_30px_-5px_rgba(255,102,0,0.18)]"
      : glow === "emerald"
      ? "hover:border-emerald-500/40 hover:shadow-[0_0_30px_-5px_rgba(48,209,88,0.18)]"
      : glow === "amber"
      ? "hover:border-amber-500/40 hover:shadow-[0_0_30px_-5px_rgba(255,159,10,0.18)]"
      : "hover:border-white/15";

  return (
    <div
      className={`apple-card p-5.5 bg-[#0e0f14]/80 border border-white/[0.08] backdrop-blur-2xl shadow-xl transition-all duration-300 ${glowClass} ${className}`}
    >
      {/* Header bar if title/tag exists */}
      {(title || tag || badge || Icon) && (
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex size-8 items-center justify-center border border-primary/25 bg-primary/10 text-primary shadow-[0_0_12px_rgba(255,102,0,0.15)]">
                <Icon className="size-4" />
              </div>
            )}
            <div>
              {tag && (
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tag}
                </span>
              )}
              {title && (
                <h3 className="font-sans text-sm font-semibold tracking-tight text-white">
                  {title}
                </h3>
              )}
            </div>
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}

      {children}
    </div>
  );
}
