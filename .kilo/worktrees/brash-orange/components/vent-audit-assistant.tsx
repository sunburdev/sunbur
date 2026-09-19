"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type AuditProject, openingSize } from "@/lib/vent-audit"
import { applyAssistantEdit, type AssistantEdit } from "@/lib/vent-assistant"

type Message = { role: "user" | "assistant"; content: string; edits?: AssistantEdit | null; applied?: boolean }
export function VentAuditAssistant({ project, step, proposalId, onApply, valid }: {
  project: AuditProject; step: number; proposalId: "new" | "mixed" | null; onApply: (p: AuditProject) => void; valid: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]), [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  const [configured, setConfigured] = useState<boolean | null>(null)
  const abort = useRef<AbortController | null>(null), serial = useRef(0)
  const signature = JSON.stringify({ project, proposalId })
  const [answeredFor, setAnsweredFor] = useState(signature)
  const [expanded, setExpanded] = useState(true)
  useEffect(() => {
    const c = new AbortController()
    fetch("/api/vent-audit-advice", { signal: c.signal }).then(r => r.json()).then(r => setConfigured(r.configured)).catch(() => {})
    return () => c.abort()
  }, [])
  useEffect(() => { serial.current++; abort.current?.abort(); setBusy(false); setError(""); return () => abort.current?.abort() }, [signature])
  async function ask(text: string) {
    if (!text.trim() || busy || !valid) return
    abort.current?.abort()
    const controller = new AbortController(); abort.current = controller
    const seq = ++serial.current, timeout = setTimeout(() => controller.abort(), 30_000)
    const current = answeredFor === signature ? messages : []
    setMessages([...current, { role: "user", content: text }]); setQuestion(""); setError(""); setBusy(true); setAnsweredFor(signature)
    try {
      const response = await fetch("/api/vent-audit-advice", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ project, step, proposalId, question: text, history: current.slice(-8).map(m => ({ role: m.role, content: m.content })) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Не удалось получить ответ.")
      if (seq !== serial.current) return
      setConfigured(true); setMessages([...current, { role: "user", content: text }, { role: "assistant", content: data.answer, edits: data.edits }])
    } catch (e) {
      if (seq === serial.current) { setError(controller.signal.aborted ? "Ответ занял слишком много времени. Попробуйте ещё раз." : e instanceof Error ? e.message : "Не удалось связаться с помощником."); setQuestion(text) }
    } finally { clearTimeout(timeout); if (seq === serial.current) setBusy(false) }
  }
  const stale = answeredFor !== signature
  const names: Record<string, string> = { length: "Длина, м", width: "Ширина, м", height: "Высота цоколя, м", thickness: "Толщина стены, мм", shape: "Форма", wing: "Ширина крыла, м", material: "Материал" }
  const values: Record<string, string> = { rectangle: "прямоугольник", l: "Г-образная", u: "П-образная", concrete: "бетон", reinforced: "железобетон", brick: "кирпич" }
  return <aside className="va-assistant va-no-print" aria-label="Помощник по вашему дому">
    <div className="va-assistant-heading"><span className="va-assistant-icon"><Sparkles aria-hidden="true" /></span><div><h2>Помогу разобраться</h2><p>Бит · умный помощник SUNBUR</p></div><Button variant="ghost" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? "Свернуть" : "Открыть"}</Button></div>
    {expanded && <><p>Не знаете, что указать? Напишите своими словами. Я объясню и помогу заполнить.</p>
      {configured === false && <p className="va-message" role="status">Умный помощник пока не подключён. Пользуйтесь пояснениями у полей — расчёт работает самостоятельно.</p>}
      {!messages.length && <div className="va-starter"><p>Например: «Дом 8 на 10 метров, фундамент из бетона. Что мне измерить дальше?»</p></div>}
      {stale && messages.length > 0 && <p className="va-message">Данные дома изменились. Предыдущий ответ относится к старой схеме. Следующий вопрос начнёт новый разбор.</p>}
      <div className="va-chat" aria-live="polite">{messages.map((m, i) => <div key={i} className="va-chat-message" data-role={m.role}><strong>{m.role === "user" ? "Вы" : "Бит"}</strong><p>{m.content}</p>
        {m.edits && !stale && <div className="va-edit-preview"><strong>Предлагаю заполнить</strong>
          {Object.entries(m.edits.foundation ?? {}).map(([key, value]) => <p key={key}>{names[key]}: {String(project.foundation[key as keyof typeof project.foundation])} → {values[String(value)] ?? String(value)}</p>)}
          {[...(m.edits.addOpenings ?? []), ...(m.edits.updateOpenings ?? [])].map(o => <p key={o.id}>{o.id}: {openingSize(o)}, {o.wallId}, {o.offset} м от начала, центр {o.height} м от низа цоколя; решётка {o.freePercent === null ? "неизвестна" : `${o.freePercent}%`}</p>)}
          <Button disabled={m.applied} onClick={() => { try { onApply(applyAssistantEdit(project, m.edits!)); setMessages(prev => prev.map((a, n) => n === i ? { ...a, applied: true } : a)) } catch { setError("Не удалось применить. Уточните значения в форме.") } }}><Check data-icon="inline-start" />{m.applied ? "Применено" : "Применить к моему дому"}</Button>
        </div>}
      </div>)}</div>
      <div className="va-quick-questions">{(step === 0 ? ["Как измерить фундамент?", "Как указать внутренние стены?"] : step === 1 ? ["Как измерить продух?", "Что делать, если не знаю решётку?"] : ["Объясни, что нужно изменить", "Можно ли обойтись без новых отверстий?"]).map(q => <Button key={q} variant="outline" disabled={busy || !valid} onClick={() => void ask(q)}>{q}</Button>)}</div>
      {error && <p role="alert" className="va-error">{error}</p>}
      {!valid && <p className="va-message">Сначала исправьте выделенные значения, чтобы помощник получил понятную схему.</p>}
      <form className="va-ask" onSubmit={e => { e.preventDefault(); void ask(question) }}><label className="sr-only" htmlFor="va-question">Ваш вопрос или описание дома</label><Input id="va-question" value={question} maxLength={2000} onChange={e => setQuestion(e.target.value)} placeholder="Напишите здесь…" /><Button type="submit" disabled={busy || !question.trim() || !valid}>{busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />}{busy ? "Разбираюсь…" : "Спросить"}</Button></form>
      <small>После отправки помощник получает вашу схему и сообщения. Изменения применяются только по вашей кнопке.</small>
    </>}
  </aside>
}
