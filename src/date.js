export function toDate(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(value) {
  const date = toDate(value)
  if (!date) return '-'
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  return `${date.getMonth() + 1}/${date.getDate()} ${dayNames[date.getDay()]}`
}

export function getMonthMatrix(baseDate) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isThisWeek(value) {
  const date = toDate(value)
  if (!date) return false
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay())
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return date >= start && date < end
}

export function currency(value) {
  const number = Number(value || 0)
  return `${number.toLocaleString('ko-KR')}원`
}
