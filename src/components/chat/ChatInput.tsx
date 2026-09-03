import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onStopStreaming?: () => void;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, disabled, onStopStreaming, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Auto-send if there's content
      if (textareaRef.current?.value.trim()) {
        setTimeout(() => handleSend(), 100);
      }
    };

    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const hasSpeech = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  return (
    <div className="shrink-0 border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-1 rounded-3xl border border-border bg-card px-2 py-1.5 transition-colors focus-within:border-primary/40">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Generating response…" : "Message Nova AI…"}
            rows={1}
            disabled={disabled}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <div className="flex items-center gap-1 pb-0.5">
            {hasSpeech && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
                className={cn("h-9 w-9 shrink-0 rounded-full", isRecording && "text-destructive animate-pulse")}
                onClick={toggleVoice}
              >
                {isRecording ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
              </Button>
            )}
            {isStreaming ? (
              <Button
                variant="secondary"
                size="icon"
                aria-label="Stop generating"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={onStopStreaming}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                aria-label="Send message"
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
