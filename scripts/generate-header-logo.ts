import sharp from 'sharp'
import { resolve } from 'node:path'

// Header에서 height 28px (Tailwind h-7) · width 84px(w-auto)로 표시.
// retina 2x 가정 시 width 168px이면 충분. 원본 1269×832 → 168×W로 contain 리사이즈.
// 알파 채널(투명) 보존, palette PNG로 압축.
const SRC = resolve(process.cwd(), 'input/logo.png')
const OUT = resolve(process.cwd(), 'public/logo.png')

async function main() {
  const meta = await sharp(SRC).metadata()
  const ratio = (meta.height ?? 832) / (meta.width ?? 1269)
  const targetW = 168
  const targetH = Math.round(targetW * ratio)

  const buf = await sharp(SRC)
    .resize(targetW, targetH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer()
  await sharp(buf).toFile(OUT)

  const stat = await import('node:fs/promises').then(m => m.stat(OUT))
  console.log(`✓ public/logo.png (${targetW}×${targetH}, ${(stat.size / 1024).toFixed(1)} KB)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
