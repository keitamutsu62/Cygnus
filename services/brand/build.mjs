import { copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../../docs/brand')

mkdirSync(outDir, { recursive: true })
copyFileSync(resolve(__dirname, 'index.html'), resolve(outDir, 'index.html'))

console.log('✓ built → docs/brand/index.html')
