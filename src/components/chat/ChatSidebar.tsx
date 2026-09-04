import { useState } from "react";
import {
  Plus, Search, MessageSquare, Trash2, Pencil, LogOut, Sun, Moon,
  Home, LayoutTemplate, Compass, History, Wallet, PanelLeftClose, PanelLeft, Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type NovaView = "home" | "templates" | "explore" | "history" | "wallet";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  view: NovaView;
  onNavigate: (view: NovaView) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV: { key: NovaView; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "history", label: "History", icon: History },
  { key: "wallet", label: "Wallet", icon: Wallet },
];

export function ChatSidebar({
  conversations, activeId, view, onNavigate, onSelect, onNew, onDelete, onRename,
  collapsed = false, onToggleCollapse,
}: ChatSidebarProps) {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = conversations.filter(c =>
    (c.title || "New Chat").toLowerCase().includes(search.toLowerCase())
  );

  const handleRename = (id: string) => {
    if (editTitle.trim()) onRename(id, editTitle.trim());
    setEditingId(null);
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-full flex-col items-center gap-1 bg-sidebar py-3">
        <Button variant="ghost" size="icon" aria-label="Expand sidebar" onClick={onToggleCollapse} className="h-9 w-9">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="New chat" onClick={onNew} className="h-9 w-9">
          <Plus className="h-4 w-4" />
        </Button>
        <div className="mt-2 flex flex-col gap-1">
          {NAV.map(item => (
            <Button
              key={item.key}
              variant="ghost"
              size="icon"
              aria-label={item.label}
              onClick={() => onNavigate(item.key)}
              className={cn("h-9 w-9", view === item.key && "bg-sidebar-accent text-sidebar-accent-foreground")}
            >
              <item.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <div className="mt-auto">
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <span className="block h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Nova AI</span>
        {onToggleCollapse && (
          <Button
            variant="ghost" size="icon" aria-label="Collapse sidebar"
            onClick={onToggleCollapse} className="ml-auto hidden h-8 w-8 md:inline-flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* New Chat */}
      <div className="px-3 pb-2">
        <Button onClick={onNew} className="w-full justify-start gap-2 rounded-xl" size="sm">
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="h-9 rounded-xl pl-9 text-sm"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-0.5 px-3 pb-3">
        {NAV.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              view === item.key
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="h-4 w-4 opacity-80" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Recent
      </div>

      {/* Conversations */}
      <ScrollArea className="min-h-0 flex-1 px-2">
        <div className="space-y-0.5 py-1">
          {filtered.map(conv => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                activeId === conv.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
              {editingId === conv.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={() => handleRename(conv.id)}
                  onKeyDown={e => e.key === "Enter" && handleRename(conv.id)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate">{conv.title || "New Chat"}</span>
              )}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  aria-label="Rename chat"
                  onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title || ""); }}
                  className="p-1 rounded hover:bg-sidebar-border"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  aria-label="Delete chat"
                  onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                  className="p-1 rounded hover:bg-destructive/20 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No conversations yet</p>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-foreground">
            {(user?.email || "?").charAt(0)}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Toggle theme" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Sign out" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
        <a
          href="https://www.instagram.com/sameerrathod92/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground"
        >
          <Instagram className="h-3.5 w-3.5" />
          Samir
        </a>
      </div>
    </div>
  );
}
