"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUp, ChevronsDown } from "lucide-react"
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
import {
  calculateHolePrice,
  materialOptions,
  priceRates,
  pricingConfig,
  type MaterialKey,
} from "@/lib/site-data"

export function PriceCalculator() {
  const [diameterMm, setDiameterMm] = useState<number>(132)
  const [material, setMaterial] = useState<MaterialKey>("brick")
  const [depthMm, setDepthMm] = useState("250")
  const [quantity, setQuantity] = useState("1")
  const [atHeight, setAtHeight] = useState(false)
  const [underFloor, setUnderFloor] = useState(false)

  const depthValue = Math.max(0, Number(depthMm) || 0)
  const quantityValue = Math.max(1, Math.round(Number(quantity) || 1))

  const pricePerHole = useMemo(
    () =>
      calculateHolePrice({
        diameterMm,
        material,
        depthMm: depthValue,
        atHeight,
        underFloor,
      }),
    [diameterMm, material, depthValue, atHeight, underFloor],
  )

  const total = pricePerHole * quantityValue

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-2">
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="font-bold">Рассчитайте стоимость</h3>
          <p className="mt-1 text-sm text-muted-foreground">Минимум {pricingConfig.minHolePrice.toLocaleString("ru-RU")} ₽ за отверстие — дальше цена растёт с глубиной и условиями работы.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calc-diameter">Диаметр</Label>
            <Select
              value={diameterMm}
              onValueChange={(value) => setDiameterMm(value as number)}
              items={priceRates.map((row) => ({ value: row.diameterMm, label: row.diameterLabel }))}
            >
              <SelectTrigger id="calc-diameter" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priceRates.map((row) => (
                  <SelectItem key={row.diameterMm} value={row.diameterMm}>
                    {row.diameterLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calc-material">Материал</Label>
            <Select
              value={material}
              onValueChange={(value) => setMaterial(value as MaterialKey)}
              items={materialOptions}
            >
              <SelectTrigger id="calc-material" className="w-full">
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
            <Label htmlFor="calc-depth">Толщина стены, мм</Label>
            <Input
              id="calc-depth"
              type="number"
              min={0}
              inputMode="numeric"
              value={depthMm}
              onChange={(e) => setDepthMm(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calc-quantity">Количество отверстий</Label>
            <Input
              id="calc-quantity"
              type="number"
              min={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Условия работы</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={atHeight ? "default" : "outline"}
              aria-pressed={atHeight}
              onClick={() => setAtHeight((v) => !v)}
            >
              <ArrowUp data-icon="inline-start" />
              На высоте (+{pricingConfig.heightSurcharge.toLocaleString("ru-RU")} ₽)
            </Button>
            <Button
              type="button"
              variant={underFloor ? "default" : "outline"}
              aria-pressed={underFloor}
              onClick={() => setUnderFloor((v) => !v)}
            >
              <ChevronsDown data-icon="inline-start" />
              В подполе (+{pricingConfig.underFloorSurcharge.toLocaleString("ru-RU")} ₽)
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 border-t border-border bg-secondary p-6 text-secondary-foreground lg:border-t-0 lg:border-l">
        <div>
          <p className="text-sm text-muted-foreground">Ориентировочная стоимость</p>
          <p className="mt-1 font-mono text-4xl font-black tracking-tight">{total.toLocaleString("ru-RU")} ₽</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {quantityValue > 1 ? `${pricePerHole.toLocaleString("ru-RU")} ₽ × ${quantityValue} отв.` : "1 отверстие"}, минимум {pricingConfig.minHolePrice.toLocaleString("ru-RU")} ₽ за отверстие
          </p>
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
