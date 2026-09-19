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
    useRef(value) { return { current: value } },
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

test("wall handles expose numeric semantics and open contours end at their actual gap", () => {
  const contour = [
    { id: "c1", length: 4, turn: "right" }, { id: "c2", length: 3, turn: "right" },
    { id: "c3", length: 2, turn: "right" }, { id: "c4", length: 8, turn: "right" },
  ]
  const props = { input: { ...calculator.DEFAULT_FOUNDATION, shape: "custom", contour }, contour, onChange() {} }
  const canvasComponent = elements(mount(props)()).find(node => typeof node.type === "function" && node.props.contour === contour)
  const canvas = canvasComponent.type(canvasComponent.props)
  const canvasElements = elements(canvas)
  const handles = canvasElements.filter(node => node.type === "g" && node.props.className === "fc-canvas-handle")
  assert.equal(handles.length, contour.length)
  assert.equal(handles[0].props.role, "spinbutton")
  assert.equal(handles[0].props["aria-valuenow"], 4)
  assert.equal(handles[0].props["aria-valuemin"], 0.3)
  assert.equal(handles[0].props["aria-valuetext"], "4 м")
  assert.equal(handles[0].props.tabIndex, 0)

  assert.equal(canvasElements.some(node => node.type === "polygon"), false)
  const walls = canvasElements.filter(node => node.type === "line" && node.props.className === "fc-canvas-wall")
  const finalWall = walls.at(-1)
  assert.equal(finalWall.props.x1, finalWall.props.x2, "the final wall must follow its vertical direction to gap")
  assert.notEqual(finalWall.props.y1, finalWall.props.y2)
  assert.ok(finalWall.props.y2 >= 0 && finalWall.props.y2 <= 320, "gap must be included in canvas bounds")

  const disabledCanvasComponent = elements(mount({ ...props, disabled: true })()).find(node => typeof node.type === "function" && node.props.contour === contour)
  const disabledHandle = elements(disabledCanvasComponent.type(disabledCanvasComponent.props)).find(node => node.type === "g" && node.props.className === "fc-canvas-handle")
  assert.equal(disabledHandle.props.tabIndex, -1)
})

test("closed contours retain their fill", () => {
  const contour = calculator.DEFAULT_FOUNDATION.contour
  const props = { input: calculator.DEFAULT_FOUNDATION, contour, onChange() {} }
  const canvasComponent = elements(mount(props)()).find(node => typeof node.type === "function" && node.props.contour === contour)
  assert.ok(elements(canvasComponent.type(canvasComponent.props)).some(node => node.type === "polygon"))
})
