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
const { code } = transformSync(readFileSync(new URL("../components/foundation-view.tsx", import.meta.url), "utf8"), {
  filename: "foundation-view.tsx", module: { type: "commonjs" },
  jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
})
const { DEFAULT_FOUNDATION, calculateVentilation } = await import("../lib/vent-calculator.ts")

// Exercise the actual component's SVG output and event handlers with persistent hook state.
// No DOM or browser pointer-capture implementation is simulated beyond the event target API.
function mount(props) {
  const hooks = []
  let cursor = 0
  const react = {
    useId: () => "foundation-test",
    useRef(value) { const slot = cursor++; return hooks[slot] ??= { current: value } },
    useState(value) {
      const slot = cursor++
      hooks[slot] ??= value
      return [hooks[slot], next => { hooks[slot] = typeof next === "function" ? next(hooks[slot]) : next }]
    },
  }
  const module = { exports: {} }
  runInThisContext(`(function(require, module, exports) { ${code}\n})`)(name => name === "react" ? react : require(name), module, module.exports)
  return () => { cursor = 0; return module.exports.FoundationView(props) }
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== "object" || !node.props) return []
  return [node, ...elements(node.props.children)]
}
const find = (tree, predicate) => elements(tree).find(predicate)

function inside(point, vertices) {
  let hits = 0
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length]
    if ((a.z > point.z) !== (b.z > point.z) && point.x < a.x + (point.z - a.z) * (b.x - a.x) / (b.z - a.z)) hits++
  }
  return hits % 2 === 1
}

for (const shape of ["rectangle", "l", "u"]) {
  for (const reverse of [false, true]) test(`${shape}: airflow goes from inside to outside (${reverse ? "CW" : "CCW"})`, () => {
    const input = { ...DEFAULT_FOUNDATION, shape, length: 20, width: 16, wing: 6, partitions: "cross" }
    const { geometry, variants } = calculateVentilation(input)
    if (reverse) {
      geometry.vertices.reverse()
      geometry.walls = geometry.walls.map(wall => wall.internal ? wall : { ...wall, start: wall.end, end: wall.start })
    }
    const variant = variants.find(item => item.feasible)
    assert.ok(variant)
    const render = mount({ input, geometry, variant, selectedWall: null, onSelectWall() {}, showAirflow: true, view: "plan" })
    const arrows = elements(find(render(), node => node.props.className === "fv-airflow")).filter(node => node.type === "path")
    const expected = geometry.walls.filter(wall => !wall.internal).reduce((count, wall) => count + Math.ceil(variant.vents.filter(vent => vent.wallId === wall.id).length / 2), 0)
    assert.equal(arrows.length, expected)
    assert.ok(arrows.length >= geometry.vertices.length)
    const scale = Math.min(680 / input.length, 425 / input.width)
    for (const arrow of arrows) {
      const [x1, y1, x2, y2] = arrow.props.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number)
      const world = (x, y) => ({ x: (x - 480) / scale + input.length / 2, z: (y - 322) / scale + input.width / 2 })
      assert.ok(inside(world(x1, y1), geometry.vertices), `arrow starts inside: ${arrow.props.d}`)
      assert.ok(!inside(world(x2, y2), geometry.vertices), `arrow ends outside: ${arrow.props.d}`)
    }
  })
}

for (const ending of ["onPointerUp", "onPointerCancel"]) test(`secondary ${ending} leaves the primary drag active`, () => {
  const input = DEFAULT_FOUNDATION
  const { geometry, variants } = calculateVentilation(input)
  const selected = [], captures = new Set()
  const render = mount({ input, geometry, variant: variants[0], selectedWall: null, onSelectWall: id => selected.push(id), showAirflow: false, view: "3d" })
  const canvas = () => find(render(), node => node.props.className === "fv-canvas").props
  const projection = () => find(render(), node => node.type === "polygon").props.points
  const event = (pointerId, clientX = 100) => ({
    pointerId, clientX, clientY: 100, button: 0, isPrimary: pointerId === 1,
    target: { closest: () => ({ getAttribute: () => "wall-1" }) },
    currentTarget: { setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id) },
  })
  const initial = projection()
  canvas().onPointerDown(event(1))
  canvas().onPointerDown(event(2, 500))
  canvas().onPointerMove(event(2, 800))
  assert.equal(projection(), initial)
  canvas()[ending](event(2))
  assert.deepEqual(selected, [])
  assert.ok(captures.has(1))
  canvas().onPointerMove(event(1, 150))
  const rotated = projection()
  assert.notEqual(rotated, initial)
  assert.match(render().props.className, /fv-dragging/)
  canvas()[ending](event(2))
  assert.match(render().props.className, /fv-dragging/)
  canvas().onPointerMove(event(1, 200))
  assert.notEqual(projection(), rotated)
  canvas()[ending](event(1, 200))
  assert.doesNotMatch(render().props.className, /fv-dragging/)
  assert.equal(captures.size, 0)
  assert.deepEqual(selected, [])
  const finished = projection()
  canvas().onPointerMove(event(1, 300))
  assert.equal(projection(), finished)
  canvas().onPointerDown(event(1))
  canvas().onPointerUp(event(2))
  canvas().onPointerUp(event(1))
  assert.deepEqual(selected, ["wall-1"], "primary click still selects after an unrelated pointer-up")
  canvas().onPointerDown(event(1))
  canvas().onPointerCancel(event(1))
  canvas().onPointerUp(event(1))
  assert.deepEqual(selected, ["wall-1"], "cancel must never select a wall")
})
