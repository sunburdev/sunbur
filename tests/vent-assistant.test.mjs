import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context) }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
    throw error
  }
} })

const { newAuditProject } = await import("../lib/vent-audit.ts")
const { applyAssistantEdit } = await import("../lib/vent-assistant.ts")

test("assistant dimensions apply when changing away from a custom foundation", () => {
  const project = newAuditProject()
  project.foundation.shape = "custom"
  const updated = applyAssistantEdit(project, { foundation: { shape: "rectangle", length: 12, width: 9 } })
  assert.equal(updated.foundation.shape, "rectangle")
  assert.equal(updated.foundation.length, 12)
  assert.equal(updated.foundation.width, 9)
})

test("assistant dimensions cannot desynchronise a foundation that remains custom", () => {
  const project = newAuditProject()
  project.foundation.shape = "custom"
  const updated = applyAssistantEdit(project, { foundation: { length: 12, width: 9 } })
  assert.equal(updated.foundation.length, project.foundation.length)
  assert.equal(updated.foundation.width, project.foundation.width)
})
