"use client"
import { useState, type ReactNode } from "react"
import { VentConstructor } from "./vent-constructor"
import { VentAuditWizard } from "./vent-audit-wizard"

export function VentExperience({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"audit" | "new">("audit")
  if (mode === "audit") return <VentAuditWizard onLegacy={() => setMode("new")}>{children}</VentAuditWizard>
  return <><div className="va-return va-no-print"><button onClick={() => setMode("audit")}>← У меня уже есть продухи — проверить мою систему</button></div><VentConstructor>{children}</VentConstructor></>
}
