import sharp from 'sharp'
import { existsSync, copyFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const officialJpg = join(root, 'public', 'branding', 'logo-source.jpg')
const officialAlt = join(root, 'design', 'logo-source.jpg')
const outPng = join(root, 'public', 'branding', 'logo.png')
const outMark = join(root, 'public', 'branding', 'logo-mark.png')
const designOut = join(root, 'design', 'logo.png')

const source = existsSync(officialJpg)
  ? officialJpg
  : existsSync(officialAlt)
    ? officialAlt
    : join(root, 'public', 'branding', 'logo-cropped-source.png')

if (!existsSync(source)) {
  console.error('No logo source. Place official JPG at public/branding/logo-source.jpg')
  process.exit(1)
}

if (!existsSync(officialJpg) && source.endsWith('.jpg')) {
  copyFileSync(source, officialJpg)
}

function whitenTransparent(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r >= 252 && g >= 252 && b >= 252) {
      data[i + 3] = 0
    }
  }
}

async function rasterToPng(pipeline, dest) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  whitenTransparent(data)
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(dest)
  return sharp(dest).metadata()
}

// Full logo (login / light backgrounds) — keep original resolution when possible
const fullMeta = await rasterToPng(
  sharp(source).rotate().trim({ threshold: 14 }).resize(1024, null, { fit: 'inside', withoutEnlargement: true }),
  outPng,
)

// Sidebar mark: crop off gray drop shadow so it doesn’t muddy the navy bar
const trimmedBuf = await sharp(source).rotate().trim({ threshold: 14 }).toBuffer()
const trimmedMeta = await sharp(trimmedBuf).metadata()
const markHeight = Math.round(trimmedMeta.height * 0.84)

const markMeta = await rasterToPng(
  sharp(trimmedBuf).extract({
    left: 0,
    top: 0,
    width: trimmedMeta.width,
    height: Math.min(markHeight, trimmedMeta.height),
  }),
  outMark,
)

await sharp(outPng).png().toFile(designOut)

console.log(
  JSON.stringify({
    source,
    logo: { path: outPng, width: fullMeta.width, height: fullMeta.height },
    logoMark: { path: outMark, width: markMeta.width, height: markMeta.height },
  }),
)