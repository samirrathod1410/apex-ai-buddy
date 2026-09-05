import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChatSidebar, Conversation, NovaView } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput, SendMode } from "@/components/chat/ChatInput";
import { TemplatesPanel } from "@/components/chat/TemplatesPanel";
import { ExplorePanel } from "@/components/chat/ExplorePanel";
import { WalletPanel } from "@/components/chat/WalletPanel";
import { streamChat } from "@/lib/streamChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bot, Plus, ArrowDown } from "lucide-react";
import { Navigate } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Chat() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<NovaView>("home");
  const [draft, setDraft] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
    })();
  }, [activeId]);

  // Auto-scroll only when user is near the bottom
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
  }, []);

  useEffect(() => {
    if (atBottom) scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
  }, [messages, atBottom, scrollToBottom]);

  const createConversation = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Chat" })
      .select()
      .single();
    if (data) {
      await loadConversations();
      setActiveId(data.id);
      setMessages([]);
      setView("home");
      if (isMobile) setSidebarOpen(false);
    }
    return data?.id ?? null;
  };

  const persist = async (convId: string, role: "user" | "assistant", content: string) => {
    await supabase.from("messages").insert({ conversation_id: convId, role, content });
  };

  const finishConversation = async (convId: string, firstInput: string, wasEmpty: boolean) => {
    if (wasEmpty) {
      const shortTitle = firstInput.length > 40 ? firstInput.slice(0, 40) + "…" : firstInput;
      await supabase.from("conversations").update({ title: shortTitle }).eq("id", convId);
    }
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    loadConversations();
  };

  const handleSend = async (input: string, mode: SendMode = "chat") => {
    if (!user) return;
    setView("home");

    let convId = activeId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }

    const wasEmpty = messages.length === 0;
    const userMsg: Msg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    await persist(convId, "user", input);

    if (mode === "image") {
      setIsStreaming(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-image", { body: { prompt: input } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const content = `![${input.replace(/[[\]]/g, "")}](${data.image})`;
        setMessages(prev => [...prev, { role: "assistant", content }]);
        await persist(convId, "assistant", content);
        await finishConversation(convId, input, wasEmpty);
      } catch (e: any) {
        toast({ title: "Image generation failed", description: e.message, variant: "destructive" });
      }
      setIsStreaming(false);
      return;
    }

    let prompt = input;
    let sources = "";
    if (mode === "search") {
      setIsStreaming(true);
      try {
        const { data, error } = await supabase.functions.invoke("web-search", { body: { query: input } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const results = (data?.results || []) as { title: string; url: string; snippet: string }[];
        if (results.length) {
          prompt = `${input}\n\nUse these live web search results and cite them:\n${results
            .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.snippet}`)
            .join("\n\n")}`;
          sources = `\n\n**Sources**\n${results.map((r, i) => `${i + 1}. [${r.title}](${r.url})`).join("\n")}`;
        }
      } catch (e: any) {
        setIsStreaming(false);
        toast({ title: "Web search unavailable", description: e.message, variant: "destructive" });
        return;
      }
    }

    setIsStreaming(true);
    const abort = new AbortController();
    abortRef.current = abort;

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, { role: "user" as const, content: prompt }].slice(-15),
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsStreaming(false);
          const final = assistantSoFar + (assistantSoFar && sources ? sources : "");
          if (sources && assistantSoFar) {
            setMessages(prev =>
              prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? { ...m, content: final } : m))
            );
          }
          if (final) await persist(convId!, "assistant", final);
          await finishConversation(convId!, input, wasEmpty);
        },
        signal: abort.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (activeId === id) { setActiveId(null); setMessages([]); }
    loadConversations();
  };

  const handleRename = async (id: string, title: string) => {
    await supabase.from("conversations").update({ title }).eq("id", id);
    loadConversations();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const sidebarContent = (collapsedProp: boolean) => (
    <ChatSidebar
      conversations={conversations}
      activeId={activeId}
      view={view}
      onNavigate={v => { setView(v); if (isMobile) setSidebarOpen(false); }}
      onSelect={id => { setActiveId(id); setView("home"); if (isMobile) setSidebarOpen(false); }}
      onNew={createConversation}
      onDelete={handleDelete}
      onRename={handleRename}
      collapsed={collapsedProp}
      onToggleCollapse={() => setCollapsed(c => !c)}
    />
  );

  const promptCards = [
    { title: "Explain something", prompt: "Explain quantum computing in simple terms with an everyday analogy." },
    { title: "Analyze a document", prompt: "I'll paste a document. Summarize the key points, risks and action items." },
    { title: "Help with coding", prompt: "Help me debug this code. I'll paste it next — ask clarifying questions first." },
    { title: "Brainstorm ideas", prompt: "Brainstorm 10 creative ideas for a weekend side project I can ship fast." },
  ];

  const useDraft = (p: string) => { setView("home"); setDraft(p); };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className={collapsed ? "w-14 shrink-0 border-r border-border" : "w-72 shrink-0 border-r border-border"}>
          {sidebarContent(collapsed)}
        </div>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarContent(false)}
          </SheetContent>
        </Sheet>
      )}

      {/* Main area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur sm:px-4">
          {isMobile && (
            <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
              <span className="block h-2 w-2 rounded-full bg-primary" />
            </span>
            <h1 className="truncate text-sm font-medium">
              {view !== "home"
                ? view.charAt(0).toUpperCase() + view.slice(1)
                : activeId
                  ? conversations.find(c => c.id === activeId)?.title || "New Chat"
                  : "Nova AI"}
            </h1>
          </div>
          <Button variant="ghost" size="icon" aria-label="New chat" className="ml-auto" onClick={createConversation}>
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        {view === "templates" || view === "explore" || view === "wallet" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            {view === "templates" && <TemplatesPanel onUse={useDraft} />}
            {view === "explore" && <ExplorePanel />}
            {view === "wallet" && <WalletPanel />}
          </div>
        ) : view === "history" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="mx-auto w-full max-w-3xl px-4 py-8">
              <h2 className="text-2xl font-semibold tracking-tight">History</h2>
              <p className="mt-1 text-sm text-muted-foreground">Open any past conversation to continue it.</p>
              <div className="mt-6 space-y-2">
                {conversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveId(c.id); setView("home"); }}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <div className="truncate font-medium">{c.title || "New Chat"}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(c.updated_at).toLocaleString()}
                    </div>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">No conversations yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="relative min-h-0 flex-1">
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              >
                {messages.length === 0 ? (
                  <div className="flex min-h-full flex-col items-center justify-center px-5 py-10">
                    <div className="w-full max-w-md space-y-6 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-xl font-semibold tracking-tight">{greeting()}</h2>
                        <p className="text-sm text-muted-foreground">How can I help you today?</p>
                      </div>
                      <div className="grid gap-2 text-left">
                        {promptCards.map(p => (
                          <button
                            key={p.title}
                            onClick={() => useDraft(p.prompt)}
                            className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                          >
                            <div className="font-medium">{p.title}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{p.prompt}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl py-4 pb-6">
                    {messages.map((msg, i) => (
                      <ChatMessage
                        key={i}
                        role={msg.role}
                        content={msg.content}
                        isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                      />
                    ))}
                    {isStreaming && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground sm:px-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
                          <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
                        </span>
                        <span className="animate-pulse">Thinking…</span>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                )}
              </div>

              {!atBottom && messages.length > 0 && (
                <button
                  onClick={() => scrollToBottom()}
                  aria-label="Scroll to latest message"
                  className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card p-2 shadow-md transition-colors hover:bg-accent"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              )}
            </div>

            <ChatInput
              onSend={handleSend}
              disabled={isStreaming}
              isStreaming={isStreaming}
              onStopStreaming={handleStopStreaming}
              draft={draft}
              onDraftUsed={() => setDraft("")}
            />
          </>
        )}
      </div>
    </div>
  );
}
