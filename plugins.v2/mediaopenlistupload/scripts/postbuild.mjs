import { readdir, rm, utimes } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const assetsDir = join(pluginRoot, 'dist', 'assets')

async function removeIfExists(path) {
  await rm(path, { force: true, recursive: true })
}

await removeIfExists(join(assetsDir, 'index.html'))
await removeIfExists(join(assetsDir, '__federation_shared_vuetify'))

for (const name of await readdir(assetsDir)) {
  if (
    /^index(?:-[\w-]+)?\.js$/.test(name) ||
    /^__federation_expose_.+-[\w-]+\.(?:js|css)$/.test(name) ||
    /^__federation_fn_import-[\w-]+\.js$/.test(name) ||
    /^_plugin-vue_export-helper-[\w-]+\.js$/.test(name)
  ) {
    await removeIfExists(join(assetsDir, name))
  }
}

const initFile = join(pluginRoot, '__init__.py')
const now = new Date()
await utimes(initFile, now, now)
