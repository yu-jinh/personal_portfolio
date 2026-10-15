import { Marked } from 'marked'
import katex from 'katex'

// Build-time Markdown for project pages:
//   import meta from './x.md?meta'  → { title, summary, role, readingMinutes }
//   import body from './x.md'       → { html, toc }               (rendered body) Math is pre-rendered with KaTeX here, so the
// browser only needs KaTeX's CSS and fonts. See docs/adr/0003-build-time-markdown-math.md.
//
//   $$ ... $$   display math (on its own lines)
//   $ ... $     inline math (no space right inside the dollars, e.g. $R$, not $ R $)

function renderMath(tex, displayMode, id) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: true, output: 'html', strict: 'ignore' })
  } catch (err) {
    throw new Error(`KaTeX error in ${id}: ${err.message}\n  in: ${tex}`)
  }
}

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Heading HTML is entity-escaped (I'd → I&#39;d); the TOC is rendered as plain
// text by React, so turn the common entities back into characters.
const decodeEntities = (text) =>
  text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

// `toc` collects every h2 so long posts can show an "On this page" list.
function createMarkdown(id, toc) {
  const used = new Set()
  return new Marked({
    renderer: {
      heading({ tokens, depth, text }) {
        const inner = this.parser.parseInline(tokens)
        if (depth !== 2) return `<h${depth}>${inner}</h${depth}>\n`
        let slug = slugify(text) || 'section'
        for (let n = 2; used.has(slug); n++) slug = `${slugify(text)}-${n}`
        used.add(slug)
        toc.push({ id: slug, text: decodeEntities(inner.replace(/<[^>]+>/g, '')) })
        return `<h2 id="${slug}">${inner}</h2>\n`
      },
    },
    extensions: [
      {
        name: 'blockMath',
        level: 'block',
        start: (src) => src.indexOf('$$'),
        tokenizer(src) {
          const match = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src)
          if (match) return { type: 'blockMath', raw: match[0], text: match[1].trim() }
        },
        renderer: (token) => `<div class="math-block">${renderMath(token.text, true, id)}</div>\n`,
      },
      {
        name: 'inlineMath',
        level: 'inline',
        start: (src) => src.indexOf('$'),
        tokenizer(src) {
          const match = /^\$(?![\s$])((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/.exec(src)
          if (match) return { type: 'inlineMath', raw: match[0], text: match[1] }
        },
        renderer: (token) => renderMath(token.text, false, id),
      },
    ],
  })
}

// Minimal frontmatter: `key: value` lines between two `---` fences.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { meta, body: match[2] }
}

// Rough reading time in minutes: ~220 English words or ~400 CJK characters
// per minute, plus ~20 s per display equation.
function readingMinutes(body) {
  const equations = (body.match(/\$\$[\s\S]+?\$\$/g) || []).length
  const text = body
    .replace(/\$\$[\s\S]+?\$\$/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
  const cjk = (text.match(/[一-鿿]/g) || []).length
  const words = (text.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return Math.max(1, Math.round(words / 220 + cjk / 400 + equations / 3))
}

export default function markdownContent() {
  return {
    name: 'markdown-content',
    enforce: 'pre',
    transform(code, id) {
      const [file, query] = id.split('?')
      if (!file.endsWith('.md')) return null
      const { meta, body } = parseFrontmatter(code)
      // `x.md?meta` is the light version for lists and cards; the full body
      // (KaTeX HTML can be hundreds of KB) is loaded only on the project page.
      if (query === 'meta') {
        const full = { ...meta, readingMinutes: readingMinutes(body) }
        return { code: `export default ${JSON.stringify(full)}`, map: null }
      }
      const toc = []
      const html = createMarkdown(file, toc).parse(body)
      return { code: `export default ${JSON.stringify({ html, toc })}`, map: null }
    },
  }
}
