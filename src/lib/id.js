export function newId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}
