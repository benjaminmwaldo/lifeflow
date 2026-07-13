// The 5 event colors. `key` is stored on the event; empty/unknown → first (green).
export const EVENT_COLORS = [
  { key: 'green', label: 'Green', bg: '#EAF3F0', border: '#2F6F62', text: '#245A4F' },
  { key: 'blue', label: 'Blue', bg: '#E7EFF8', border: '#3B6FB0', text: '#2E5A91' },
  { key: 'rose', label: 'Rose', bg: '#F7E9EC', border: '#C1495B', text: '#9E3A49' },
  { key: 'amber', label: 'Amber', bg: '#F7EEDD', border: '#C98A3B', text: '#8A5E24' },
  { key: 'violet', label: 'Violet', bg: '#EFEAF6', border: '#7A5AA6', text: '#5E4682' },
]

const MAP = Object.fromEntries(EVENT_COLORS.map((c) => [c.key, c]))

export function colorFor(key) {
  return MAP[key] || EVENT_COLORS[0]
}
