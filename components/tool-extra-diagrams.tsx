import { fmt, type ToolInput, type ToolResult } from "@/lib/home-tools"

export function ToolExtraDiagrams({ input, result }: { input: ToolInput; result: ToolResult }) {
  if (input.kind === "angle") {
    const offset = Number(result.data.offset)
    const scale = Math.min(240 / input.wall, 170 / (offset || 1))
    const left = 360 - input.wall * scale / 2, right = 360 + input.wall * scale / 2
    const top = 185 - offset * scale / 2, bottom = 185 + offset * scale / 2
    return <>
      <text x="35" y="40" className="diagram-small">ПРОХОД ЧЕРЕЗ СТЕНУ · ВИД СБОКУ</text>
      <rect x={left} y="70" width={right - left} height="235" fill="#e0e3d9" stroke="#a3ad99" />
      <line x1={left - 70} x2={right + 35} y1={top} y2={top} stroke="#9da596" strokeDasharray="5 5" />
      <line x1={left} x2={right} y1={top} y2={bottom} stroke="#d66740" strokeWidth="12" />
      <circle cx={left} cy={top} r="7" fill="#273c32" /><circle cx={right} cy={bottom} r="7" fill="#d66740" />
      <text x={left - 15} y={top - 18} textAnchor="end" className="diagram-value">Вход</text>
      <text x={right + 15} y={bottom + 25} className="diagram-value">Выход</text>
      <text x="600" y="78" textAnchor="end" className="diagram-big">{fmt(input.angle)}°</text>
      <text x="600" y="102" textAnchor="end" className="diagram-small">от перпендикуляра</text>
      <path d={`M${left} 322H${right}M${left} 316V328M${right} 316V328`} stroke="#798772" />
      <text x="360" y="351" textAnchor="middle" className="diagram-value">Толщина {fmt(input.wall)} мм</text>
    </>
  }
  if (input.kind === "airflow") {
    const scale = 210 / Math.max(input.ductWidth, input.ductHeight)
    const width = input.ductWidth * scale, height = input.ductHeight * scale
    return <>
      <text x="35" y="40" className="diagram-small">СВОБОДНОЕ СЕЧЕНИЕ КАНАЛА</text>
      {input.shape === "round" ? <circle cx="220" cy="190" r="107" fill="#e5ebe0" stroke="#7c9176" strokeWidth="5" /> : <rect x={220 - width / 2} y={190 - height / 2} width={width} height={height} fill="#e5ebe0" stroke="#7c9176" strokeWidth="5" />}
      <text x="220" y="185" textAnchor="middle" className="diagram-big">{fmt(Number(result.data.speed), 2)}</text>
      <text x="220" y="213" textAnchor="middle" className="diagram-value">м/с</text>
      <text x="405" y="135" className="diagram-small">РАСХОД ВОЗДУХА</text>
      <text x="405" y="167" className="diagram-big">{fmt(input.flow)} м³/ч</text>
      <path d="M405 195H640M629 186L640 195L629 204" fill="none" stroke="#d66740" strokeWidth="3" />
      <text x="405" y="243" className="diagram-small">Целевая скорость</text>
      <text x="405" y="273" className="diagram-value">{fmt(input.targetSpeed)} м/с · задана вами</text>
      <text x="220" y="337" textAnchor="middle" className="diagram-value">{input.shape === "round" ? `Ø ${fmt(input.ductDiameter)} мм` : `${fmt(input.ductWidth)} × ${fmt(input.ductHeight)} мм`}</text>
      <text x="35" y="368" className="diagram-small">ВНУТРЕННИЕ РАЗМЕРЫ · СХЕМАТИЧНО</text>
    </>
  }
  if (input.kind === "sealant") return <>
    <text x="35" y="40" className="diagram-small">КОЛЬЦЕВОЙ ШОВ ВОКРУГ ТРУБЫ</text>
    <circle cx="225" cy="190" r="125" fill="#dce0d5" />
    <circle cx="225" cy="190" r="109" fill="#d66740" />
    <circle cx="225" cy="190" r={109 * input.tube / input.hole} fill="#f5f5ef" stroke="#899580" strokeWidth="2" />
    <text x="225" y="184" textAnchor="middle" className="diagram-value">Ø {fmt(input.tube)}</text>
    <text x="225" y="209" textAnchor="middle" className="diagram-small">труба, мм</text>
    <text x="405" y="121" className="diagram-small">ЗАЗОР НА СТОРОНУ</text>
    <text x="405" y="153" className="diagram-big">{fmt(Number(result.data.gap))} мм</text>
    <rect x="405" y="186" width="18" height="18" rx="3" fill="#d66740" />
    <text x="433" y="201" className="diagram-value">Герметик</text>
    <text x="405" y="251" className="diagram-small">Глубина заполнения</text>
    <text x="405" y="280" className="diagram-value">{fmt(input.fillDepth)} мм суммарно</text>
    <text x="225" y="345" textAnchor="middle" className="diagram-value">Отверстие Ø {fmt(input.hole)} мм</text>
  </>
  return null
}
