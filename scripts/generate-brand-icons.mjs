import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = new URL("../", import.meta.url)
const background = "#1A1A1F"
const source = await readFile(new URL("public/sunbur-mark.svg", root), "utf8")
const mark = source.match(/<g\b[\s\S]*<\/g>/)?.[0]
if (!mark) throw new Error("The canonical SUNBUR SVG must contain a mark group.")

// Slightly enlarge the mark for small browser tabs; home-screen tiles get more air.
function tile(size) {
  const inset = size <= 48 ? 3 : 7
  const scale = (64 - inset * 2) / 64
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
  <title>SUNBUR</title>
  <rect width="64" height="64" fill="${background}"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">${mark}</g>
</svg>
`
}

function render(size) {
  return sharp(Buffer.from(tile(size))).resize(size, size)
}

// Classic 32-bit DIB entries keep the favicon compatible with older ICO readers.
async function icoImage(size) {
  const pixels = await render(size).ensureAlpha().raw().toBuffer()
  const maskStride = Math.ceil(size / 32) * 4
  const dib = Buffer.alloc(40 + size * size * 4 + maskStride * size)
  dib.writeUInt32LE(40, 0)
  dib.writeInt32LE(size, 4)
  dib.writeInt32LE(size * 2, 8)
  dib.writeUInt16LE(1, 12)
  dib.writeUInt16LE(32, 14)
  dib.writeUInt32LE(size * size * 4, 20)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = (y * size + x) * 4
      const to = 40 + ((size - y - 1) * size + x) * 4
      dib[to] = pixels[from + 2]
      dib[to + 1] = pixels[from + 1]
      dib[to + 2] = pixels[from]
      dib[to + 3] = pixels[from + 3]
    }
  }
  return dib
}

const sizes = [16, 32, 48]
const images = await Promise.all(sizes.map(icoImage))
const directory = Buffer.alloc(6 + sizes.length * 16)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(sizes.length, 4)
let offset = directory.length
images.forEach((image, index) => {
  const entry = 6 + index * 16
  directory[entry] = sizes[index]
  directory[entry + 1] = sizes[index]
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(image.length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += image.length
})

await Promise.all([
  render(192).png().toFile(fileURLToPath(new URL("app/icon.png", root))),
  render(180).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toFile(fileURLToPath(new URL("app/apple-icon.jpg", root))),
  render(180).png().toFile(fileURLToPath(new URL("public/apple-icon.png", root))),
  render(32).png().toFile(fileURLToPath(new URL("public/icon-light-32x32.png", root))),
  render(32).png().toFile(fileURLToPath(new URL("public/icon-dark-32x32.png", root))),
  writeFile(new URL("public/icon.svg", root), tile(192)),
  writeFile(new URL("app/favicon.ico", root), Buffer.concat([directory, ...images])),
])

console.log("Generated SUNBUR icons from public/sunbur-mark.svg (ICO: 16/32/48; app: 192; Apple: 180).")
