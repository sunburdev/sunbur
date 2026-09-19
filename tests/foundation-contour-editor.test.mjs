import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import test from "node:test"
import { runInThisContext } from "node:vm"

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context) }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
    throw error
  }
} })

const require = createRequire(import.meta.url)
const { transformSync } = require("next/dist/build/swc")
const { code } = transformSync(readFileSync(new URL("../components/foundation-contour-editor.tsx", import.meta.url), "utf8"), {
  filename: "foundation-contour-editor.tsx", module: { type: "commonjs" },
  jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
})
const calculator = await import("../lib/vent-calculator.ts")

function mount(props) {
  const hooks = []
  let cursor = 0
  const react = {
    useState(value) {
      const slot = cursor++
      hooks[slot] ??= value
      return [hooks[slot], next => { hooks[slot] = typeof next === "function" ? next(hooks[slot]) : next }]
    },
  }
  const module = { exports: {} }
  runInThisContext(`(function(require, module, exports) { ${code}\n})`)(name => {
    if (name === "react") return react
    if (name === "@/lib/vent-calculator") return calculator
    if (name === "lucide-react") return { Plus() { return null }, Trash2() { return null } }
    return require(name)
  }, module, module.exports)
  return () => { cursor = 0; return module.exports.ContourEditor(props) }
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== "object" || !node.props) return []
  return [node, ...elements(node.props.children)]
}

test("the cross template rejects an unsupported 1 m by 1 m contour", () => {
  const contour = calculator.templateContour("cross", 1, 1)
  const changes = []
  const render = mount({
    input: { ...calculator.DEFAULT_FOUNDATION, shape: "custom", length: 1, width: 1, contour },
    contour,
    onChange: next => changes.push(next),
  })
  const crossTemplate = elements(render()).find(node => node.type === "button" && node.props.children === "Крестом")
  crossTemplate.props.onClick()
  assert.deepEqual(changes, [])
  const alert = elements(render()).find(node => node.props.role === "alert")
  assert.match(alert.props.children, /Шаблон не применён:.*Длина: от 2 до 40 м.*Ширина: от 2 до 40 м/)
})
