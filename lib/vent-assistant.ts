import { z } from "zod"
import { auditProjectSchema, openingSchema, type AuditProject } from "./vent-audit"

export const assistantEditSchema = z.object({
  foundation: z.object({
    length: z.number().optional(), width: z.number().optional(), height: z.number().optional(), thickness: z.number().optional(),
    shape: z.enum(["rectangle", "l", "u"]).optional(), wing: z.number().optional(),
    material: z.enum(["concrete", "reinforced", "brick"]).optional(),
  }).strict().optional(),
  addOpenings: z.array(openingSchema).max(20).optional(),
  updateOpenings: z.array(openingSchema).max(20).optional(),
}).strict()
export type AssistantEdit = z.infer<typeof assistantEditSchema>
export const assistantReplySchema = z.object({ answer: z.string().min(1).max(10000), edits: assistantEditSchema.nullable() }).strict()
export function applyAssistantEdit(project: AuditProject, edits: AssistantEdit): AuditProject {
  const parsed = assistantEditSchema.parse(edits)
  const updates = parsed.updateOpenings ?? []
  if (updates.some(o => !project.openings.some(old => old.id === o.id))) throw new Error("Помощник указал неизвестный номер отверстия.")
  // The assistant can't describe a custom contour, so it must not silently desync
  // length/width from the contour that actually drives that shape's geometry.
  const foundationShape = parsed.foundation?.shape ?? project.foundation.shape
  const foundationEdits = foundationShape === "custom" && parsed.foundation
    ? (({ length, width, ...rest }) => rest)(parsed.foundation)
    : parsed.foundation
  // Geometry changes never silently relocate measurements; the editor exposes orphaned points.
  return auditProjectSchema.parse({ ...project, foundation: { ...project.foundation, ...foundationEdits }, inventoryComplete: false,
    openings: [...project.openings.map(o => updates.find(u => u.id === o.id) ?? o), ...(parsed.addOpenings ?? [])] })
}
