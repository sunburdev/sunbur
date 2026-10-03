import Link from "next/link"
import { ArrowUpRight, Wind } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import "./tools.css"

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <div className="tools-scope"><header className="tools-header"><Link href="/" className="tools-brand"><span><Wind size={22} /></span>SUNBUR<small>инструменты для вашего дома</small></Link><div className="tools-header-actions"><Link href="/instrumenty">Все инструменты <ArrowUpRight size={16} /></Link><ThemeToggle /></div></header>{children}<footer className="tools-footer"><Link href="/">SUNBUR · Алмазное бурение</Link><span>От понятной схемы — к точному отверстию.</span><Link href="/#contacts">Обсудить с мастером ↗</Link></footer></div>
}
