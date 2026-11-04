"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Copy,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"

interface Message {
  role: "user" | "assistant"
  content: string
  followUpQuestions?: string[]
}

const apiUrl = process.env.NEXT_PUBLIC_IMAGE_SEARCH_API_URL?.replace(/\/$/, "")
const welcomeMessage: Message = {
  role: "assistant",
  content: "Hello! I'm your collection assistant. How can I help you today?",
}

const MarkdownContent = ({ content, isFullScreen }: { content: string; isFullScreen: boolean }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ node, ...props }) => (
          <img
            {...props}
            className={cn(
              "rounded-md border border-border shadow-sm h-auto my-2",
              isFullScreen ? "max-w-2xl" : "max-w-full"
            )}
            loading="lazy"
          />
        ),
        a: ({ node, ...props }) => (
          <a {...props} className="text-blue-800 hover:underline dark:text-blue-300" target="_blank" rel="noopener noreferrer" />
        ),
        p: ({ node, ...props }) => (
          <p {...props} className="mb-2 last:mb-0 leading-relaxed text-slate-900 dark:text-slate-100" />
        ),
        h1: ({ node, ...props }) => (
          <h1 {...props} className="text-slate-950 dark:text-white" />
        ),
        h2: ({ node, ...props }) => (
          <h2 {...props} className="text-slate-950 dark:text-white" />
        ),
        h3: ({ node, ...props }) => (
          <h3 {...props} className="text-slate-950 dark:text-white" />
        ),
        li: ({ node, ...props }) => (
          <li {...props} className="text-slate-900 dark:text-slate-100" />
        ),
        strong: ({ node, ...props }) => (
          <strong {...props} className="font-semibold text-slate-950 dark:text-white" />
        ),
        table: ({ node, ...props }) => (
          <div className="my-4 overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table {...props} className="w-full text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40" />
          </div>
        ),
        th: ({ node, ...props }) => (
          <th {...props} className="border-b bg-muted/50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" />
        ),
        td: ({ node, ...props }) => (
          <td {...props} className="border-b px-4 py-3 font-normal" />
        )
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your collection assistant. How can I help you today?" },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const conversationUserId = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null
      if (conversationUserId.current !== userId) {
        conversationUserId.current = userId
        setMessages([welcomeMessage])
        setInput("")
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, isLoading])

  const handleSend = async (suggestedQuestion?: string) => {
    const userMessage = suggestedQuestion?.trim() || input.trim()
    if (!userMessage || isLoading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    let requestUserId: string | null = null
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!data.session) throw new Error("Sign in to use the collection assistant.")
      requestUserId = data.session.user.id
      if (!apiUrl) throw new Error("The collection assistant is not configured.")

      const sameUserConversation = conversationUserId.current === data.session.user.id
      if (!sameUserConversation) {
        conversationUserId.current = data.session.user.id
        setMessages([welcomeMessage])
      }

      const response = await fetch(`${apiUrl}/v1/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          question: userMessage,
          history: (sameUserConversation ? messages : []).slice(-3).map((message) => ({
            role: message.role,
            content: message.content.slice(-1000),
          })),
        }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Failed to get a response.")
      const assistantMessage = result?.answer
      if (typeof assistantMessage !== "string" || !assistantMessage) {
        throw new Error("The assistant returned an invalid response.")
      }
      const followUpQuestions = Array.isArray(result?.follow_up_questions)
        ? result.follow_up_questions
            .filter((question: unknown): question is string => typeof question === "string")
            .map((question: string) => question.trim())
            .filter(Boolean)
            .slice(0, 3)
        : []
      if (conversationUserId.current !== data.session.user.id) return

      setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage, followUpQuestions }])
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assistant could not complete that search."
      if (conversationUserId.current === requestUserId) {
        setMessages((prev) => [...prev, { role: "assistant", content: message }])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const startNewChat = () => {
    if (window.confirm("Are you sure you want to start a new conversation?")) {
      setMessages([welcomeMessage])
    }
  }

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      toast({ title: "Copied", description: "Response copied to clipboard." })
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className={cn(
      "z-50 transition-all duration-300",
      isOpen
        ? (isFullScreen ? "fixed inset-0 p-0 sm:p-4 bg-black/20 backdrop-blur-sm" : "fixed bottom-6 right-6 max-sm:inset-0 max-sm:bottom-0 max-sm:right-0 max-sm:p-0")
        : "fixed bottom-6 right-6"
    )}>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-2xl hover:scale-110 transition-transform bg-primary text-white"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className={cn(
          "flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5 duration-300",
          isFullScreen
            ? "w-full h-full max-w-5xl mx-auto rounded-none sm:rounded-lg"
            : "w-80 sm:w-[450px] h-[600px]",
          "max-sm:w-full max-sm:h-full max-sm:rounded-none"
        )}>
          <CardHeader className="p-4 bg-primary text-primary-foreground rounded-t-lg max-sm:rounded-none flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Collection Assistant</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startNewChat}
                      className="h-8 w-8 hover:bg-white/20 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>New Chat</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="h-8 w-8 hover:bg-white/20 text-white max-sm:hidden"
                    >
                      {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isFullScreen ? "Minimize" : "Full Screen"}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setIsOpen(false); setIsFullScreen(false); }}
                      className="h-8 w-8 hover:bg-white/20 text-white"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Close</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden bg-background">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="max-w-4xl mx-auto space-y-4 pr-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "group flex flex-col rounded-lg p-4 text-sm shadow-sm transition-all relative",
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground max-w-[85%] sm:max-w-[80%]"
                        : "bg-slate-100 text-slate-950 border border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 max-w-[95%] sm:max-w-[90%]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 opacity-70 text-[10px] uppercase font-bold tracking-wider">
                        {m.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        {m.role === "user" ? "You" : "Assistant"}
                      </div>
                      {m.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(m.content, i)}
                        >
                          {copiedId === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <div className={cn(
                      "prose prose-sm max-w-none break-words",
                      (isFullScreen || typeof window !== 'undefined' && window.innerWidth < 640) ? "prose-base" : "",
                      m.role === "user"
                        ? "prose-invert"
                        : "prose-slate prose-headings:text-slate-950 prose-p:text-slate-900 prose-li:text-slate-900 prose-strong:text-slate-950 prose-th:text-slate-900 prose-td:text-slate-900 dark:prose-invert dark:prose-headings:text-white dark:prose-p:text-slate-100 dark:prose-li:text-slate-100 dark:prose-strong:text-white dark:prose-th:text-slate-100 dark:prose-td:text-slate-100"
                    )}>
                      <MarkdownContent content={m.content} isFullScreen={isFullScreen} />
                    </div>
                    {m.role === "assistant" && !!m.followUpQuestions?.length && (
                      <div className="mt-3 space-y-2 border-t border-slate-300 pt-3 dark:border-slate-600">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">You could also ask</p>
                        <div className="flex flex-wrap gap-2">
                          {m.followUpQuestions.map((question, questionIndex) => (
                            <Button
                              key={`${question}-${questionIndex}`}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isLoading}
                              className="h-auto whitespace-normal border-slate-400 bg-white text-left text-slate-900 hover:bg-slate-200 hover:text-slate-950 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 dark:hover:text-white"
                              onClick={() => handleSend(question)}
                            >
                              {question}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-muted text-muted-foreground max-w-[85%] rounded-lg p-3 text-sm animate-pulse flex items-center gap-2 border border-border shadow-sm">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Assistant is thinking...
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-4 border-t bg-background rounded-b-lg max-sm:rounded-none">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex w-full items-center space-x-2 max-w-4xl mx-auto"
            >
              <Input
                placeholder="Ask about your collection..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                className={cn(
                  "flex-1",
                  (isFullScreen || typeof window !== 'undefined' && window.innerWidth < 640) ? "h-12 text-base" : "h-10 text-sm"
                )}
                disabled={isLoading}
              />
              <Button
                type="submit"
                size={(isFullScreen || typeof window !== 'undefined' && window.innerWidth < 640) ? "lg" : "icon"}
                className={cn(
                  (isFullScreen || typeof window !== 'undefined' && window.innerWidth < 640) ? "h-12 px-6" : ""
                )}
                disabled={isLoading || !input.trim()}
              >
                {(isFullScreen || typeof window !== 'undefined' && window.innerWidth < 640) ? <span className="flex items-center gap-2">Send <Send className="h-4 w-4" /></span> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
