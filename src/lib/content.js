import 'katex/dist/katex.min.css'

// Every src/content/projects/<slug>.<lang>.md file, compiled at build time by
// vite/markdown-content.js. Frontmatter is bundled with the app (cards, titles);
// each rendered body is its own chunk, fetched only when its page opens.
const metas = import.meta.glob('../content/projects/*.md', { query: '?meta', import: 'default', eager: true })
const bodies = import.meta.glob('../content/projects/*.md', { import: 'default' })

const keyOf = (path) => {
  const found = path.match(/\/([\w-]+)\.(en|zh)\.md(?:\?.*)?$/)
  return found ? `${found[1]}.${found[2]}` : null
}

// Frontmatter `facts: 200 Hz :: teleop command rate || 30 fps :: camera stream`
// → [{ value: '200 Hz', context: 'teleop command rate' }, …]. Every number on
// the site is written with what it measures, so it never stands alone.
const parseFacts = (raw) =>
  (raw || '')
    .split('||')
    .map((item) => item.split('::').map((s) => s.trim()))
    .filter(([value, context]) => value && context)
    .map(([value, context]) => ({ value, context }))

const posts = {}
for (const [path, meta] of Object.entries(metas)) {
  const key = keyOf(path)
  if (key) posts[key] = { ...meta, facts: parseFacts(meta.facts), key }
}

const loaders = {}
for (const [path, load] of Object.entries(bodies)) {
  const key = keyOf(path)
  if (key) loaders[key] = load
}

// Falls back to the other language so a missing translation never blanks a page.
export function getPost(slug, lang) {
  return posts[`${slug}.${lang}`] || posts[`${slug}.en`] || posts[`${slug}.zh`] || null
}

// Resolves to { html, toc } for the post returned by getPost(slug, lang).
export function loadPostBody(post) {
  return loaders[post.key]()
}
