/**
 * Zips the built extension (dist-ext) so the demo can offer it as a download.
 * Run after `npm run build:ext`; `npm run build` does both.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { zipSync } from 'fflate'

const root = 'dist-ext'
const files: Record<string, Uint8Array> = {}
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (!name.endsWith('.map')) files[`focus-lens/${relative(root, path)}`] = readFileSync(path)
  }
}
walk(root)
if (!files['focus-lens/manifest.json']) throw new Error('dist-ext has no manifest.json: run npm run build:ext first')
const zip = zipSync(files, { level: 9 })
writeFileSync('public/focus-lens-extension.zip', zip)
console.log(`focus-lens-extension.zip: ${Object.keys(files).length} files, ${(zip.length / 1024).toFixed(0)} KB`)
