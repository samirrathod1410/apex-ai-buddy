import { MessageSquare, ImagePlus, Globe, Mic, Paperclip, History, Wallet } from "lucide-react";

const FEATURES = [
  { icon: MessageSquare, title: "Streaming AI chat", desc: "Real-time responses with full markdown, code and tables.", status: "Available" },
  { icon: ImagePlus, title: "Image generation", desc: "Describe an image and Nova generates it for you.", status: "Available" },
  { icon: Paperclip, title: "File attachments", desc: "Attach text-based files and ask questions about them.", status: "Available" },
  { icon: Mic, title: "Voice input", desc: "Speak your prompt using browser speech recognition.", status: "Available" },
  { icon: History, title: "Conversation history", desc: "Search, rename, revisit and continue any past chat.", status: "Available" },
  { icon: Globe, title: "Web search", desc: "Live web results woven into answers with sources.", status: "Needs setup" },
  { icon: Wallet, title: "Wallet & credits", desc: "Usage tracking and billing.", status: "Coming soon" },
];

const badgeStyle: Record<string, string> = {
  Available: "border-primary/40 bg-primary/10 text-foreground",
  "Needs setup": "border-border bg-muted text-muted-foreground",
  "Coming soon": "border-border bg-muted text-muted-foreground",
};

export function ExplorePanel() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h2 className="text-2xl font-semibold tracking-tight">Explore</h2>
      <p className="mt-1 text-sm text-muted-foreground">Everything Nova AI can do right now.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {FEATURES.map(f => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <f.icon className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeStyle[f.status]}`}>
                    {f.status}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
