import { build } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const assets = path.join(dist, 'assets')

await rm(dist, { force: true, recursive: true })
await mkdir(assets, { recursive: true })
await cp(path.join(root, 'public'), dist, { recursive: true })

await build({
  entryPoints: [path.join(root, 'src/main.tsx')],
  bundle: true,
  minify: true,
  sourcemap: false,
  splitting: false,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: path.join(assets, 'main.js'),
  define: {
    'import.meta.env': JSON.stringify({
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
    }),
  },
  loader: {
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.gif': 'file',
    '.webp': 'file',
  },
  assetNames: 'assets/[name]-[hash]',
})

const sourceHtml = await readFile(path.join(root, 'index.html'), 'utf8')
const html = sourceHtml.replace(
  '<script type="module" src="/src/main.tsx"></script>',
  '<link rel="stylesheet" href="/assets/main.css" />\n    <script type="module" src="/assets/main.js"></script>',
)

await writeFile(path.join(dist, 'index.html'), html)

console.log('Built static app to dist/')
