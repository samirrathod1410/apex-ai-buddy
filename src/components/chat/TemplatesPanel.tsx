import { useState } from "react";
import { TEMPLATE_CATEGORIES } from "@/lib/templates";
import { cn } from "@/lib/utils";

export function TemplatesPanel({ onUse }: { onUse: (prompt: string) => void }) {
  const [active, setActive] = useState(TEMPLATE_CATEGORIES[0].name);
  const category = TEMPLATE_CATEGORIES.find(c => c.name === active)!;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h2 className="text-2xl font-semibold tracking-tight">Templates</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a starting point — it goes straight into your composer.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TEMPLATE_CATEGORIES.map(c => (
          <button
            key={c.name}
            onClick={() => setActive(c.name)}
            className={cn(
              "rounded-full border border-border px-3.5 py-1.5 text-xs transition-colors hover:bg-accent",
              active === c.name && "border-primary/50 bg-primary/10 text-foreground"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {category.templates.map(t => (
          <button
            key={t.title}
            onClick={() => onUse(t.prompt)}
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <div className="text-sm font-medium">{t.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
