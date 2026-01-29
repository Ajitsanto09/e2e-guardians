function pad2(n: number) {
  return String(n).padStart(2, '0');
}

// ISO week number
function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export function getPeriodKeys(date: Date) {
  const { year, week } = isoWeek(date);
  const weekKey = `${year}-W${pad2(week)}`;
  const monthKey = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  return { weekKey, monthKey };
}
