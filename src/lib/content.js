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

const posts = {}
for (const [path, meta] of Object.entries(metas)) {
  const key = keyOf(path)
  if (key) posts[key] = { ...meta, key }
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
