import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const SRC = resolve(process.cwd(), 'input/logo.png')
const OUT_DIR = resolve(process.cwd(), 'public/icons')

async function makeIcon(size: number, fileName: string, padRatio: number) {
  const inner = Math.round(size * padRatio)
  const resized = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(resolve(OUT_DIR, fileName))
  console.log(`✓ ${fileName} (${size}×${size})`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  // 일반 아이콘: 가장자리까지 거의 꽉 채움
  await makeIcon(192, 'icon-192.png', 0.96)
  await makeIcon(512, 'icon-512.png', 0.96)
  // maskable: Android adaptive icon이 가장자리를 자를 수 있어 80% 안전 영역에 배치
  await makeIcon(512, 'icon-maskable-512.png', 0.8)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
