const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '2024.09' → 'Sep 2024' (en) or '2024.09' (zh). A bare year is returned as-is.
export function formatMonth(value, lang) {
  const [year, month] = value.split('.')
  if (!month || lang === 'zh') return value
  return `${MONTHS[Number(month) - 1]} ${year}`
}

export function formatRange(start, end, lang, presentLabel) {
  const from = formatMonth(start, lang)
  const to = end ? formatMonth(end, lang) : presentLabel
  return from === to ? from : `${from} – ${to}`
}
