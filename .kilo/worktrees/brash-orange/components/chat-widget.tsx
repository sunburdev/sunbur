"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import type { FormEvent, ReactNode } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Bot, Calculator, Loader2, MessageCircle, RotateCcw, Send, Square, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { site } from "@/lib/site-data"

type PriceToolOutput = {
  pricePerHoleRub: number
  quantity: number
  totalRub: number
  minHolePriceRub: number
  note: string
}

const SUGGESTIONS = [
  "нужно отверстие в бетоне 200 мм под вытяжку, диаметр 125 — сколько возьмёте?",
  "надо провести канализацию через фундамент, стена 400 бетон, во что обойдётся?",
  "3 дырки под кондиционеры в кирпиче по 50 мм, посчитайте цену",
  "а вы сегодня можете подъехать?",
]

const rub = (n: number) => n.toLocaleString("ru-RU") + " ₽"

const INLINE_MARKDOWN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g

/** Renders the small subset of markdown the model tends to use in chat replies: [links](url) and **bold**. */
function renderInlineMarkdown(text: string) {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  for (const match of text.matchAll(INLINE_MARKDOWN)) {
    if (match.index! > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const [, linkLabel, linkHref, bold] = match
    if (linkHref) {
      nodes.push(
        <a
          key={key++}
          href={linkHref}
          target={linkHref.startsWith("tel:") ? undefined : "_blank"}
          rel="noreferrer"
          className="font-semibold text-primary underline underline-offset-2"
        >
          {linkLabel}
        </a>,
      )
    } else if (bold) {
      nodes.push(<strong key={key++}>{bold}</strong>)
    }
    lastIndex = match.index! + match[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

export function ChatWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error, regenerate, stop, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const isBusy = status === "submitted" || status === "streaming"

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, status])

  function submit(e?: FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isBusy) return
    setInput("")
    sendMessage({ text })
  }

  function submitSuggestion(text: string) {
    if (isBusy) return
    sendMessage({ text })
  }

  if (pathname?.replace(/\/$/, "") === "/kalkulyator-produhov" || pathname?.startsWith("/instrumenty")) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            size="icon-lg"
            className="fixed right-4 bottom-20 z-40 size-14 rounded-full shadow-lg shadow-primary/20 md:right-6 md:bottom-6"
            aria-label="Открыть чат с ИИ-помощником"
          />
        }
      >
        <MessageCircle className="size-6" />
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2 font-mono">
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="size-4" />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-popover bg-emerald-500" aria-hidden="true" />
            </span>
            Бит · ИИ-помощник SUNBUR
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex animate-in fade-in slide-in-from-bottom-1 gap-2 duration-300">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-3.5" />
              </span>
              <div className="flex max-w-[85%] flex-col gap-2">
                <p className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed">
                  Привет, я Бит! Отвечу на вопросы про алмазное бурение и прикину стоимость отверстия — назовите диаметр, материал и толщину стены.
                </p>
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => submitSuggestion(s)}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex animate-in fade-in slide-in-from-bottom-1 gap-2 duration-300 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                    message.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                </span>
                <div className={`flex max-w-[85%] flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}>
                  {message.parts.map((part, i) => {
                    if (part.type === "text" && part.text) {
                      return (
                        <p
                          key={i}
                          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                            message.role === "user" ? "rounded-tr-sm bg-secondary text-secondary-foreground" : "rounded-tl-sm bg-muted"
                          }`}
                        >
                          {renderInlineMarkdown(part.text)}
                          {part.state === "streaming" && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" />}
                        </p>
                      )
                    }

                    if (part.type === "tool-calculate_price") {
                      if (part.state === "input-streaming" || part.state === "input-available") {
                        return (
                          <div key={i} className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                            <Calculator className="size-3.5 animate-pulse" />
                            Считаю стоимость...
                          </div>
                        )
                      }
                      if (part.state === "output-available") {
                        const output = part.output as PriceToolOutput
                        return (
                          <div key={i} className="w-full overflow-hidden rounded-2xl rounded-tl-sm border border-primary/30 bg-secondary text-secondary-foreground">
                            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2 text-xs font-bold tracking-wide text-primary uppercase">
                              <Calculator className="size-3.5" />
                              Расчёт стоимости
                            </div>
                            <div className="flex flex-col gap-1 px-3 py-2.5">
                              <p className="font-mono text-2xl font-black tracking-tight">{rub(output.totalRub)}</p>
                              <p className="text-xs text-muted-foreground">
                                {output.quantity > 1 ? `${rub(output.pricePerHoleRub)} × ${output.quantity} отв.` : "1 отверстие"}, минимум {rub(output.minHolePriceRub)} за отверстие
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{output.note}</p>
                            </div>
                          </div>
                        )
                      }
                      if (part.state === "output-error") {
                        return (
                          <p key={i} className="rounded-2xl rounded-tl-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            Не получилось посчитать. Уточните диаметр, материал и толщину стены ещё раз.
                          </p>
                        )
                      }
                    }

                    return null
                  })}
                </div>
              </div>
            ))}

            {status === "submitted" && (
              <div className="flex items-center gap-2 pl-9 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Печатает...
              </div>
            )}

            {error && (
              <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <p>Не получилось получить ответ. Можно позвонить: <a className="font-semibold underline" href={`tel:${site.phone}`}>{site.phoneDisplay}</a></p>
                <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => { clearError(); regenerate() }}>
                  <RotateCcw data-icon="inline-start" />
                  Повторить
                </Button>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t border-border">
          <form onSubmit={submit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.keyCode === 13) && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Например: отверстие 132 мм в бетоне 300 мм"
              disabled={isBusy}
              aria-label="Сообщение для ИИ-помощника"
            />
            {isBusy ? (
              <Button type="button" size="icon" variant="outline" onClick={() => stop()} aria-label="Остановить">
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Отправить">
                <Send className="size-4" />
              </Button>
            )}
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
