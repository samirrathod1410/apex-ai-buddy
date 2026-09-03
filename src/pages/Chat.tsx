import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChatSidebar, Conversation } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { streamChat } from "@/lib/streamChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bot, Plus, ArrowDown } from "lucide-react";
import { Navigate } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      if (isMobile) setSidebarOpen(false);
    }
    return data?.id ?? null;
  };

  const handleSend = async (input: string) => {
    if (!user) return;

    let convId = activeId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }

    const userMsg: Msg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: input,
    });

    // Start streaming
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
        messages: [...messages, userMsg].slice(-15),
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsStreaming(false);
          // Save assistant message
          if (assistantSoFar) {
            await supabase.from("messages").insert({
              conversation_id: convId!,
              role: "assistant",
              content: assistantSoFar,
            });
          }
          // Auto-title on first message
          if (messages.length === 0) {
            const shortTitle = input.length > 40 ? input.slice(0, 40) + "…" : input;
            await supabase.from("conversations").update({ title: shortTitle }).eq("id", convId!);
            loadConversations();
          }
          // Update conversation timestamp
          await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId!);
          loadConversations();
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

  const sidebarContent = (
    <ChatSidebar
      conversations={conversations}
      activeId={activeId}
      onSelect={id => { setActiveId(id); if (isMobile) setSidebarOpen(false); }}
      onNew={createConversation}
      onDelete={handleDelete}
      onRename={handleRename}
    />
  );

  const examplePrompts = [
    "Summarize a long document for me",
    "Help me draft a professional email",
    "Explain a complex topic simply",
    "Brainstorm ideas for my project",
  ];

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="w-72 shrink-0 border-r border-border">
          {sidebarContent}
        </div>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main chat area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header */}
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
              {activeId
                ? conversations.find(c => c.id === activeId)?.title || "New Chat"
                : "Nova AI"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="New chat"
            className="ml-auto"
            onClick={createConversation}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

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
                    <h2 className="text-xl font-semibold tracking-tight">How can I help you?</h2>
                    <p className="text-sm text-muted-foreground">Ask anything, or start with an example.</p>
                  </div>
                  <div className="grid gap-2 text-left">
                    {examplePrompts.map(p => (
                      <button
                        key={p}
                        onClick={() => handleSend(p)}
                        className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                      >
                        {p}
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

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
        />
      </div>
    </div>
  );

}
