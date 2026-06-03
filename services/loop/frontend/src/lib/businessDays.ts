/**
 * 今日の翌日から締日（closingDay 日）まで何営業日あるかを返す。
 * closedWeekday: 0=日〜6=土、null=定休日なし
 */
export function businessDaysToClosing(
  closingDay: number,
  closedWeekday: number | null,
): number {
  const today = new Date()
  const d = today.getDate()
  const closing = d <= closingDay
    ? new Date(today.getFullYear(), today.getMonth(), closingDay)
    : new Date(today.getFullYear(), today.getMonth() + 1, closingDay)

  let count = 0
  const cur = new Date(today)
  cur.setDate(cur.getDate() + 1)
  while (cur <= closing) {
    if (closedWeekday === null || cur.getDay() !== closedWeekday) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
