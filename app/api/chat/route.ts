import { createOpenAI } from "@ai-sdk/openai"
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai"
import { z } from "zod"
import {
  applyQuantityDiscount,
  calculateHolePrice,
  faqs,
  locations,
  materialOptions,
  priceRates,
  pricingConfig,
  quantityDiscountTiers,
  services,
  site,
  type MaterialKey,
} from "@/lib/site-data"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const MODEL = process.env.OPENAI_MODELS || process.env.OPENAI_MODEL || "gpt-4o-mini"
const MAX_HISTORY_MESSAGES = 24

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 15
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string) {
  const now = Date.now()
  const bucket = rateLimitBuckets.get(ip)
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  bucket.count += 1
  return bucket.count > RATE_LIMIT_MAX_REQUESTS
}

const systemPrompt = `Тебя зовут Бит — ты ИИ-консультант компании SUNBUR, которая занимается алмазным бурением и сверлением отверстий в Солнечногорске и Солнечногорском городском округе.

Отвечай кратко, по делу, на русском языке. Помогай клиентам разобраться в услугах и приблизительно оценить стоимость отверстия через инструмент calculate_price — не считай стоимость в уме, всегда вызывай инструмент, когда известны диаметр, материал и глубина (толщина конструкции).

Услуги компании: ${services.map((s) => s.title).join(", ")}.

Материалы и диаметры, с которыми работаем: ${priceRates.map((r) => r.diameterLabel).join(", ")}. Материалы: ${materialOptions.map((m) => m.label).join(", ")}.

Минимальная стоимость одного отверстия — ${pricingConfig.minHolePrice} ₽. Доплата за работу на высоте — ${pricingConfig.heightSurcharge} ₽, в подполе — ${pricingConfig.underFloorSurcharge} ₽.

Если глубина превышает ${pricingConfig.extendedDepthThresholdMm} мм, стандартной коронки не хватает и нужен удлинитель — стоимость каждого сантиметра глубины свыше ${pricingConfig.extendedDepthThresholdMm} мм увеличивается в ${pricingConfig.extendedDepthRateMultiplier} раза. Инструмент calculate_price уже учитывает это автоматически.

Скидка за количество отверстий (инструмент calculate_price уже применяет её к totalRub): ${quantityDiscountTiers.slice().sort((a, b) => a.minQuantity - b.minQuantity).map((tier) => `от ${tier.minQuantity} шт. — ${tier.percent}%`).join(", ")}. Если клиент называет количество ниже ближайшего порога, можно вежливо упомянуть, сколько отверстий останется до скидки.

Работаем в населённых пунктах: ${locations.join(", ")}.

Частые вопросы клиентов и ответы на них:
${faqs.map(([q, a]) => `— ${q} ${a}`).join("\n")}

Контакты для оформления заявки: телефон ${site.phoneDisplay}, WhatsApp ${site.whatsapp}, Telegram ${site.telegram}, email ${site.email}. Часы работы: ${site.hours}.

Если вопрос не про бурение отверстий или услуги компании — вежливо верни разговор к теме. Если не хватает данных для расчёта (диаметр, материал, глубина) — уточни их у клиента, прежде чем вызывать инструмент. Итоговая цена calculate_price — ориентировочная; всегда уточняй, что точную стоимость мастер подтвердит по фото объекта. Для оформления заявки предлагай позвонить или написать в WhatsApp/Telegram.`

const diameterLiterals = priceRates.map((r) => z.literal(r.diameterMm)) as [
  z.ZodLiteral<number>,
  z.ZodLiteral<number>,
  ...z.ZodLiteral<number>[],
]
const materialValues = materialOptions.map((m) => m.value) as [MaterialKey, ...MaterialKey[]]

const tools = {
  calculate_price: tool({
    description: "Рассчитывает ориентировочную стоимость одного или нескольких одинаковых отверстий по действующим расценкам компании SUNBUR.",
    inputSchema: z.object({
      diameterMm: z.union(diameterLiterals).describe("Диаметр отверстия в мм — один из поддерживаемых диаметров."),
      material: z.enum(materialValues).describe("Материал конструкции."),
      depthMm: z.number().min(1).describe("Толщина стены или перекрытия в мм (глубина бурения)."),
      quantity: z.number().int().min(1).default(1).describe("Количество одинаковых отверстий."),
      atHeight: z.boolean().default(false).describe("Работа выполняется на высоте (нужна вышка/подъём)."),
      underFloor: z.boolean().default(false).describe("Работа выполняется в подполе или приямке."),
    }),
    execute: async ({ diameterMm, material, depthMm, quantity, atHeight, underFloor }) => {
      const pricePerHole = calculateHolePrice({ diameterMm, material, depthMm, atHeight, underFloor })
      const subtotalRub = pricePerHole * quantity
      const discount = applyQuantityDiscount(subtotalRub, quantity)
      return {
        pricePerHoleRub: pricePerHole,
        quantity,
        subtotalRub,
        discountPercent: discount.percent,
        discountAmountRub: discount.discountAmount,
        totalRub: discount.total,
        minHolePriceRub: pricingConfig.minHolePrice,
        note: "Ориентировочная стоимость с учётом скидки за количество (если применима). Точная цена подтверждается мастером по фото объекта и условиям доступа.",
      }
    },
  }),
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Чат временно недоступен. Свяжитесь с нами по телефону." }, { status: 500 })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (isRateLimited(ip)) {
    return Response.json({ error: "Слишком много сообщений подряд. Подождите немного и попробуйте снова." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Некорректный запрос." }, { status: 400 })
  }

  const rawMessages = (body as { messages?: UIMessage[] })?.messages
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return Response.json({ error: "Пустое сообщение." }, { status: 400 })
  }
  const uiMessages = rawMessages.slice(-MAX_HISTORY_MESSAGES)

  const openaiProvider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  })

  const result = streamText({
    model: openaiProvider.chat(MODEL),
    system: systemPrompt,
    messages: await convertToModelMessages(uiMessages, { tools }),
    tools,
    stopWhen: stepCountIs(3),
    temperature: 0.4,
    onError: ({ error }) => {
      console.error("chat api stream error", error)
    },
  })

  return result.toUIMessageStreamResponse()
}
