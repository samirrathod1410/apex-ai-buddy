import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Square, Paperclip, X, ImagePlus, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SendMode = "chat" | "image" | "search";

interface Attachment {
  name: string;
  content: string;
}

interface ChatInputProps {
  onSend: (message: string, mode: SendMode) => void;
  disabled?: boolean;
  onStopStreaming?: () => void;
  isStreaming?: boolean;
  draft?: string;
  onDraftUsed?: () => void;
}

const TEXTY = /\.(txt|md|markdown|csv|json|ya?ml|log|html?|css|jsx?|tsx?|py|java|rb|go|rs|php|c|cpp|h|sql|sh)$/i;

export function ChatInput({
  onSend, disabled, onStopStreaming, isStreaming, draft, onDraftUsed,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<SendMode>("chat");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (draft) {
      setInput(draft);
      textareaRef.current?.focus();
      onDraftUsed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || disabled) return;
    const withFiles = attachments.length
      ? `${text}\n\n${attachments
          .map(a => `--- Attached file: ${a.name} ---\n${a.content}`)
          .join("\n\n")}`
      : text;
    onSend(withFiles, mode);
    setInput("");
    setAttachments([]);
    setMode("chat");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttachError(null);
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!TEXTY.test(file.name)) {
        setAttachError(`${file.name}: only text-based files are supported right now.`);
        continue;
      }
      if (file.size > 200_000) {
        setAttachError(`${file.name} is too large (max 200 KB).`);
        continue;
      }
      next.push({ name: file.name, content: (await file.text()).slice(0, 100_000) });
    }
    if (next.length) setAttachments(prev => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const hasSpeech =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const placeholder = isStreaming
    ? "Generating response…"
    : mode === "image"
      ? "Describe the image you want…"
      : mode === "search"
        ? "What should I search the web for?"
        : "Message Nova AI…";

  return (
    <div className="shrink-0 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:px-4">
      <div className="mx-auto max-w-3xl">
        {/* Action chips */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(m => (m === "image" ? "chat" : "image"))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent",
              mode === "image" && "border-primary/50 bg-primary/10 text-foreground"
            )}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Create an image
          </button>
          <button
            type="button"
            onClick={() => setMode(m => (m === "search" ? "chat" : "search"))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent",
              mode === "search" && "border-primary/50 bg-primary/10 text-foreground"
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            Search the web
          </button>
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs">
                <Paperclip className="h-3 w-3 opacity-60" />
                <span className="max-w-[160px] truncate">{a.name}</span>
                <button
                  aria-label={`Remove ${a.name}`}
                  onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {attachError && <p className="mb-2 text-xs text-destructive">{attachError}</p>}

        <div className="flex items-end gap-1 rounded-3xl border border-border bg-card px-2 py-1.5 transition-colors focus-within:border-primary/40">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <Button
            variant="ghost" size="icon" aria-label="Attach a file"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </Button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="max-h-44 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <div className="flex items-center gap-1 pb-0.5">
            {hasSpeech && (
              <Button
                variant="ghost" size="icon"
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
                className={cn("h-9 w-9 shrink-0 rounded-full", isRecording && "text-destructive animate-pulse")}
                onClick={toggleVoice}
              >
                {isRecording ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
              </Button>
            )}
            {isStreaming ? (
              <Button
                variant="secondary" size="icon" aria-label="Stop generating"
                className="h-9 w-9 shrink-0 rounded-full" onClick={onStopStreaming}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon" aria-label="Send message"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={handleSend}
                disabled={!input.trim() || disabled}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Nova AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
