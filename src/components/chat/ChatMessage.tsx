import { Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function AiAvatar() {
  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
      <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
    </div>
  );
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex justify-end px-3 py-2 sm:px-4"
      >
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground sm:max-w-[75%]">
          {content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="group flex gap-2.5 px-3 py-2 sm:gap-3 sm:px-4"
    >
      <AiAvatar />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none break-words text-[15px] leading-7",
            "prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
            "prose-p:my-2.5 prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0",
            "prose-ul:my-2.5 prose-ol:my-2.5 prose-li:my-0.5 prose-li:marker:text-muted-foreground",
            "prose-strong:text-foreground prose-a:text-primary prose-a:underline prose-a:underline-offset-2",
            "prose-hr:border-border prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:text-muted-foreground",
            "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
            "prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted/60 prose-pre:p-3 prose-pre:text-[13px]"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node, ...props }) => (
                <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
                  <table className="my-0 w-full text-sm" {...props} />
                </div>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-primary align-middle" />
          )}
        </div>
        {!isStreaming && content && (
          <button
            onClick={handleCopy}
            aria-label="Copy response"
            className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
