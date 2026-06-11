import sharp from 'sharp'
import { readFileSync } from 'fs'

const loopSvg  = readFileSync('/Users/mutsuurakeita/Desktop/Cygnus/services/loop/frontend/public/favicon.svg')
const studioSvg = readFileSync('/Users/mutsuurakeita/Desktop/Cygnus/services/studio/frontend/public/favicon.svg')

// LOOP: apple-touch-icon 180x180, favicon 32x32
await sharp(loopSvg).resize(180,180).png().toFile(
  '/Users/mutsuurakeita/Desktop/Cygnus/services/loop/frontend/public/apple-touch-icon.png')
console.log('✓ LOOP apple-touch-icon.png')

await sharp(loopSvg).resize(32,32).png().toFile(
  '/Users/mutsuurakeita/Desktop/Cygnus/services/loop/frontend/public/favicon-32x32.png')
console.log('✓ LOOP favicon-32x32.png')

await sharp(loopSvg).resize(16,16).png().toFile(
  '/Users/mutsuurakeita/Desktop/Cygnus/services/loop/frontend/public/favicon-16x16.png')
console.log('✓ LOOP favicon-16x16.png')

// STUDIO: apple-touch-icon 180x180, favicon 32x32
await sharp(studioSvg).resize(180,180).png().toFile(
  '/Users/mutsuurakeita/Desktop/Cygnus/services/studio/frontend/public/apple-touch-icon.png')
console.log('✓ STUDIO apple-touch-icon.png')

await sharp(studioSvg).resize(32,32).png().toFile(
  '/Users/mutsuurakeita/Desktop/Cygnus/services/studio/frontend/public/favicon-32x32.png')
console.log('✓ STUDIO favicon-32x32.png')

await sharp(studioSvg).resize(16,16).png().toFile(
  '/Users/mutsuurakeita/Desktop/Cygnus/services/studio/frontend/public/favicon-16x16.png')
console.log('✓ STUDIO favicon-16x16.png')

console.log('Done!')
