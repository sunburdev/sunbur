import { calculateHomeTool, fmt, type ToolInput } from "@/lib/home-tools"
import { ToolExtraDiagrams } from "./tool-extra-diagrams"

export function ToolDiagram({ input }: { input: ToolInput }) {
  const result = calculateHomeTool(input)
  return <svg className={`tool-diagram tool-diagram-${input.kind}`} viewBox="0 0 720 380" role="img" aria-label={`Наглядная схема: ${result.summary}`}>
    <defs><pattern id={`grid-${input.kind}`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" opacity=".07" /></pattern></defs>
    <rect width="720" height="380" fill={`url(#grid-${input.kind})`} />
    <ToolExtraDiagrams input={input} result={result} />
    {(input.kind === "diameter" || input.kind === "equipment") && (() => {
      const required = Number(result.data.required)
      const selected = Number(result.data.selected) || required
      const pipe = input.kind === "diameter" ? input.pipe : required * .76
      const outer = Math.max(required, selected)
      const radius = (d: number) => d / outer * 123
      return <>
        <line x1="145" y1="190" x2="505" y2="190" stroke="currentColor" opacity=".16" strokeDasharray="6 5" />
        <line x1="325" y1="28" x2="325" y2="350" stroke="currentColor" opacity=".16" strokeDasharray="6 5" />
        <circle cx="325" cy="190" r="135" fill="#dcded4" />
        <circle cx="325" cy="190" r="123" fill="#f8f8f2" stroke="#d66740" strokeWidth="3" />
        {input.kind === "diameter" && <>
          <circle cx="325" cy="190" r={radius(pipe + 2 * (input.insulation + input.sleeve))} fill="#9ca898" />
          <circle cx="325" cy="190" r={radius(pipe + 2 * input.insulation)} fill="#e1bd8c" />
        </>}
        <circle cx="325" cy="190" r={radius(pipe)} fill="#f5f5ef" stroke="#858e80" strokeWidth="5" />
        <text x="325" y="186" textAnchor="middle" className="diagram-big">Ø {fmt(selected)}</text>
        <text x="325" y="210" textAnchor="middle" className="diagram-small">{result.data.selected ? "диаметр отверстия, мм" : "расчётный проход, мм"}</text>
        <path d="M 424 116 H 477 L 497 96 H 630" fill="none" stroke="#d66740" />
        <text x="501" y="83" className="diagram-small">{input.kind === "diameter" ? result.data.selected ? "Фактический зазор" : "Заданный зазор" : "По инструкции"}</text>
        <text x="501" y="121" className="diagram-value">{input.kind === "diameter" ? `${fmt(Number(result.data.actualClearance ?? input.clearance))} мм / сторону` : `Ø ${required} мм`}</text>
        {input.kind === "diameter" && <text x="501" y="157" className="diagram-small">Проходящая часть Ø{fmt(input.pipe)}</text>}
        <text x="35" y="345" className="diagram-small">ПОПЕРЕЧНЫЙ РАЗРЕЗ · СХЕМАТИЧНО</text>
      </>
    })()}
    {input.kind === "slope" && <>
      <path d="M70 85H650V305H70Z" fill="#e9e7dd" />
      <path d="M70 85H650" stroke="#8c967e" strokeWidth="3" />
      <text x="72" y="65" className="diagram-small">ОБЩАЯ НУЛЕВАЯ ОТМЕТКА</text>
      <path d={`M100 155L620 ${155 + input.slope * 7}`} stroke="#d66740" strokeWidth="17" strokeLinecap="round" />
      <path d={`M100 155L620 ${155 + input.slope * 7}`} stroke="#ffd6ae" strokeWidth="9" strokeLinecap="round" />
      <path d="M100 325H620M100 319V331M620 319V331" stroke="#7a8374" />
      <text x="360" y="350" textAnchor="middle" className="diagram-value">{fmt(input.length)} м</text>
      <text x="100" y="126" className="diagram-value">{fmt(input.startDepth)} см</text>
      <text x="620" y={195 + input.slope * 7} textAnchor="end" className="diagram-value">{fmt(Number(result.data.endDepth))} см</text>
      <text x="365" y="110" textAnchor="middle" className="diagram-big">{fmt(input.slope)} см/м</text>
      <text x="365" y="280" textAnchor="middle" className="diagram-small">Вертикальный масштаб увеличен для наглядности</text>
    </>}
    {input.kind === "estimate" && <>
      <text x="50" y="50" className="diagram-small">СТОИМОСТЬ ПО ПОЗИЦИЯМ</text>
      {(result.data.rows as { diameter: number; total: number }[]).slice(0, 5).map((row, i, rows) => <g key={i}>
        <text x="50" y={92 + i * 54} className="diagram-value">{i + 1}. Ø{row.diameter}</text>
        <rect x="170" y={75 + i * 54} width={Math.max(4, row.total / Math.max(...rows.map(r => r.total)) * 330)} height="26" rx="5" fill={i % 2 ? "#7d907b" : "#d66740"} />
        <text x="520" y={94 + i * 54} className="diagram-value">{fmt(row.total, 0)} ₽</text>
      </g>)}
      <text x="50" y="365" className="diagram-small">{input.rows.length > 5 ? "Первые 5 позиций; полная детализация в смете ниже" : "По действующим тарифам SUNBUR"}</text>
    </>}
    {input.kind === "moisture" && (() => {
      const x = (temp: number) => 60 + (temp + 60) / 110 * 600
      return <>
        <text x="50" y="50" className="diagram-small">ТОЧКА РОСЫ И ТЕМПЕРАТУРА ПОВЕРХНОСТИ</text>
        {[-50, -25, 0, 25, 50].map(temp => <g key={temp}><line x1={x(temp)} x2={x(temp)} y1="80" y2="295" stroke="currentColor" opacity=".12" /><text x={x(temp)} y="322" textAnchor="middle" className="diagram-small">{temp} °C</text></g>)}
        {[{ t: Number(result.data.insideDew), label: "Точка росы внутри", color: "#d66740" }, { t: Number(result.data.outsideDew), label: "Точка росы снаружи", color: "#778e9e" }, { t: input.surfaceTemp, label: "Поверхность", color: "#75866d" }].map((item, i) => <g key={item.label}>
          <text x="60" y={87 + i * 82} className="diagram-small">{item.label} · {fmt(item.t)} °C</text>
          <line x1="60" x2={x(item.t)} y1={109 + i * 82} y2={109 + i * 82} stroke={item.color} strokeWidth="10" strokeLinecap="round" />
          <circle cx={x(item.t)} cy={109 + i * 82} r="8" fill={item.color} stroke="#fafaf6" strokeWidth="3" />
        </g>)}
      </>
    })()}
    {input.kind === "photo" && <>
      <rect x="170" y="55" width="380" height="265" rx="12" fill="#e5e7de" stroke="#acb5a4" strokeDasharray="6 6" />
      <path d="M205 280L300 180L370 236L425 167L510 280" fill="#c5cdbd" />
      <circle cx="430" cy="120" r="22" fill="#d8b89b" />
      <circle cx="300" cy="170" r="20" fill="#d66740" /><text x="300" y="176" textAnchor="middle" fill="white" fontSize="17">1</text>
      <text x="360" y="351" textAnchor="middle" className="diagram-small">ФОТОГРАФИЯ + МЕТКИ + РАЗМЕРЫ</text>
    </>}
  </svg>
}
