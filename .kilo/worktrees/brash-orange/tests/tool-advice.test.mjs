import assert from "node:assert/strict"
import { createServer } from "node:http"
import { registerHooks } from "node:module"
import { after, before, test } from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
  try { return nextResolve(specifier, context) } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
    throw error
  }
} })
const { POST, GET } = await import("../app/api/tool-advice/route.ts")
const { defaultToolInput } = await import("../lib/home-tools.ts")
const { toolsCatalog } = await import("../lib/tools-catalog.ts")
const originalEnv = { ...process.env }
let server, received, sequence = 0, failure = false
before(async () => {
  server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk
    received = JSON.parse(body)
    res.setHeader("Content-Type", "application/json")
    if (failure) { res.statusCode = 500; res.end(JSON.stringify({ error: { message: "fixture failure" } })); return }
    res.end(JSON.stringify({ id: "chatcmpl-fixture", object: "chat.completion", created: 1, model: "fixture-model", choices: [{ index: 0, message: { role: "assistant", content: "Ответ тестового провайдера по переданным параметрам." }, finish_reason: "stop" }], usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 } }))
  })
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`
  process.env.OPENAI_API_KEY = "local-test-only"
  process.env.OPENAI_MODELS = "fixture-model"
})
after(async () => {
  for (const key of ["OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODELS"]) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key]
  }
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve))
})
const request = (body, headers = {}) => new Request("http://localhost/api/tool-advice", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `fixture-${sequence++}`, ...headers }, body: JSON.stringify(body) })

for (const { id: kind } of toolsCatalog) test(`${kind} sends recomputed context through the real SDK to the test provider`, async () => {
  const response = await POST(request({ input: defaultToolInput(kind), question: "Объясни результат" }))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).source, "llm")
  assert.equal(received.model, "fixture-model")
  const user = received.messages.find(message => message.role === "user")
  const context = JSON.parse(typeof user.content === "string" ? user.content : user.content.find(part => part.type === "text").text)
  assert.equal(context.input.kind, kind)
  assert.equal(context.serverResult.metrics.length, 3)
  if (kind === "diameter") {
    assert.equal(context.serverResult.data.selected, 112)
    assert.equal(context.serverResult.data.options.find(option => option.diameter === 120).clearance, 5)
    assert.equal(context.serverResult.data.options.find(option => option.diameter === 120).cost, null)
    assert.ok(context.serverResult.data.sources.length >= 2)
  }
})
test("photo attachment reaches vision input only when explicitly supplied", async () => {
  const image = "data:image/jpeg;base64,/9j/2Q==" // Transport fixture, not a vision-quality test.
  const response = await POST(request({ input: defaultToolInput("photo"), question: "Подготовь задание", image }))
  assert.equal(response.status, 200)
  const user = received.messages.find(message => message.role === "user")
  assert.ok(user.content.some(part => part.type === "image_url" && part.image_url.url === image))
  assert.equal((await POST(request({ input: defaultToolInput("diameter"), question: "test", image }))).status, 400)
})
test("API rejects forged results, invalid parameters, external image URLs and oversized bodies", async () => {
  const body = { input: defaultToolInput("diameter"), question: "test" }
  assert.equal((await POST(request({ ...body, result: { price: 1 } }))).status, 400)
  assert.equal((await POST(request({ ...body, input: { ...body.input, pipe: -10 } }))).status, 400)
  assert.equal((await POST(request({ ...body, image: "https://example.com/private.jpg" }))).status, 400)
  assert.equal((await POST(request(body, { "content-length": "3000000" }))).status, 413)
  assert.equal((await POST(request(body, { origin: "https://other.example" }))).status, 403)
  assert.equal((await POST(request(body, { origin: "null" }))).status, 403)
})
test("same-origin calls survive Next internal URL reconstruction", async () => {
  const response = await POST(request({ input: defaultToolInput("slope"), question: "Поясни" }, { origin: "https://sunbur.ru", host: "sunbur.ru" }))
  assert.equal(response.status, 200)
})
test("missing configuration and provider errors never become fabricated AI answers", async () => {
  delete process.env.OPENAI_API_KEY
  assert.equal((await GET().json()).configured, false)
  const body = { input: defaultToolInput("estimate"), question: "Объясни цену" }
  const unavailable = await POST(request(body))
  assert.equal(unavailable.status, 503)
  assert.ok(!(await unavailable.json()).answer)
  process.env.OPENAI_API_KEY = "local-test-only"
  failure = true
  const failed = await POST(request(body))
  assert.equal(failed.status, 502)
  assert.ok(!(await failed.json()).answer)
  failure = false
})
