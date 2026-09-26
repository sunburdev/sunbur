"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUp, ChevronsDown, Plus, Tag, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { crownDiameters } from "@/lib/diameter-catalog"
import {
  applyQuantityDiscount,
  calculateHolePrice,
  materialOptions,
  pricingConfig,
  quantityDiscountTiers,
  type MaterialKey,
} from "@/lib/site-data"

type CalculatorRow = {
  id: number
  diameterMm: number
  material: MaterialKey
  depthMm: string
  quantity: string
  atHeight: boolean
  underFloor: boolean
}

const MAX_ROWS = 10

const diameterItems = crownDiameters.map((diameter) => ({ value: diameter, label: `Ø ${diameter} мм` }))

const rub = (value: number) => `${value.toLocaleString("ru-RU")} ₽`

const holesWord = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return "отверстие"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "отверстия"
  return "отверстий"
}

const materialLabel = (material: MaterialKey) =>
  materialOptions.find((option) => option.value === material)?.label.toLowerCase() ?? material

export function PriceCalculator() {
  const nextId = useRef(2)
  const [rows, setRows] = useState<CalculatorRow[]>([
    { id: 1, diameterMm: 132, material: "brick", depthMm: "250", quantity: "1", atHeight: false, underFloor: false },
  ])

  const updateRow = (id: number, patch: Partial<CalculatorRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const addRow = () =>
    setRows((current) => {
      if (current.length >= MAX_ROWS) return current
      // New positions usually share the wall with the previous one, so start from its settings.
      const last = current[current.length - 1]
      return [...current, { ...last, id: nextId.current++, quantity: "1" }]
    })

  const removeRow = (id: number) =>
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current))

  const priced = useMemo(
    () =>
      rows.map((row) => {
        const depth = Math.max(0, Number(row.depthMm) || 0)
        const quantity = Math.max(1, Math.round(Number(row.quantity) || 1))
        const unitPrice = calculateHolePrice({
          diameterMm: row.diameterMm,
          material: row.material,
          depthMm: depth,
          atHeight: row.atHeight,
          underFloor: row.underFloor,
        })
        return { ...row, depth, quantityValue: quantity, unitPrice, total: unitPrice * quantity }
      }),
    [rows],
  )

  const totalQuantity = priced.reduce((sum, row) => sum + row.quantityValue, 0)
  const subtotal = priced.reduce((sum, row) => sum + row.total, 0)
  const discount = applyQuantityDiscount(subtotal, totalQuantity)
  const total = discount.total

  const nextTier = useMemo(() => {
    const ascending = [...quantityDiscountTiers].sort((a, b) => a.minQuantity - b.minQuantity)
    return ascending.find((tier) => tier.minQuantity > totalQuantity)
  }, [totalQuantity])

  const multiRow = rows.length > 1

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-2">
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="font-bold">Рассчитайте стоимость</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Добавьте позиции с разными диаметрами и материалами — например, 1 отверстие Ø120 в бетоне и 4 отверстия Ø132 в кирпиче. Минимум {rub(pricingConfig.minHolePrice)} за отверстие.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {rows.map((row, index) => {
            const prefix = `calc-${row.id}`
            return (
              <div
                role="group"
                aria-label={`Позиция ${index + 1}`}
                key={row.id}
                className={multiRow ? "flex flex-col gap-4 rounded-xl border border-border p-4" : "flex flex-col gap-4"}
              >
                {multiRow && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">Позиция {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Удалить позицию ${index + 1}`}
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${prefix}-diameter`}>Диаметр коронки</Label>
                    <Select
                      value={row.diameterMm}
                      onValueChange={(value) => updateRow(row.id, { diameterMm: value as number })}
                      items={diameterItems}
                    >
                      <SelectTrigger id={`${prefix}-diameter`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {diameterItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${prefix}-material`}>Материал</Label>
                    <Select
                      value={row.material}
                      onValueChange={(value) => updateRow(row.id, { material: value as MaterialKey })}
                      items={materialOptions}
                    >
                      <SelectTrigger id={`${prefix}-material`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {materialOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${prefix}-depth`}>Толщина стены, мм</Label>
                    <Input
                      id={`${prefix}-depth`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.depthMm}
                      onChange={(e) => updateRow(row.id, { depthMm: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${prefix}-quantity`}>Количество отверстий</Label>
                    <Input
                      id={`${prefix}-quantity`}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">Условия работы</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={row.atHeight ? "default" : "outline"}
                      aria-pressed={row.atHeight}
                      onClick={() => updateRow(row.id, { atHeight: !row.atHeight })}
                    >
                      <ArrowUp data-icon="inline-start" />
                      На высоте (+{rub(pricingConfig.heightSurcharge)})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={row.underFloor ? "default" : "outline"}
                      aria-pressed={row.underFloor}
                      onClick={() => updateRow(row.id, { underFloor: !row.underFloor })}
                    >
                      <ChevronsDown data-icon="inline-start" />
                      В подполе (+{rub(pricingConfig.underFloorSurcharge)})
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {rows.length < MAX_ROWS && (
          <Button type="button" variant="outline" className="self-start" onClick={addRow}>
            <Plus data-icon="inline-start" />
            Добавить позицию
          </Button>
        )}
      </div>

      <div className="flex flex-col justify-between gap-6 border-t border-border bg-secondary p-6 text-secondary-foreground lg:border-t-0 lg:border-l">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Ориентировочная стоимость</p>
            {discount.percent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                <Tag data-icon="inline-start" className="size-3.5" />
                -{discount.percent}% за объём
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            {discount.percent > 0 && (
              <span className="font-mono text-lg text-muted-foreground line-through">{rub(subtotal)}</span>
            )}
            <p className="font-mono text-4xl font-black tracking-tight">{rub(total)}</p>
          </div>

          {multiRow ? (
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {priced.map((row, index) => (
                <li key={row.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">
                    {index + 1}. {row.quantityValue} × Ø{row.diameterMm} · {materialLabel(row.material)} · {row.depth} мм
                  </span>
                  <span className="shrink-0 font-mono font-medium">{rub(row.total)}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t border-border pt-2 font-medium">
                <span>
                  Всего {totalQuantity} {holesWord(totalQuantity)}
                </span>
                <span className="shrink-0 font-mono">{rub(subtotal)}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {totalQuantity > 1 ? `${rub(priced[0].unitPrice)} × ${totalQuantity} отв.` : "1 отверстие"}, минимум {rub(pricingConfig.minHolePrice)} за отверстие
            </p>
          )}

          {discount.percent > 0 ? (
            <p className="mt-2 text-sm font-medium text-primary">Экономия {rub(discount.discountAmount)} благодаря скидке за количество</p>
          ) : nextTier ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Ещё {nextTier.minQuantity - totalQuantity} {holesWord(nextTier.minQuantity - totalQuantity)} — и скидка {nextTier.percent}%
              {multiRow && " (считается по всем позициям)"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">Точная цена — после уточнения условий доступа и фото объекта.</p>
          <Button size="lg" render={<Link href="#contacts" />}>
            Отправить заявку
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  )
}
