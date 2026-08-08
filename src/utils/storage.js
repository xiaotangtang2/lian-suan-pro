export const loadLocal = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
export const saveLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value))
export const money = value => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const copyText = async text => navigator.clipboard.writeText(String(text))
