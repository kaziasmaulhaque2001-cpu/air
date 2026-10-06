/**
 * Robust date formatting for WhatsApp & Instagram messaging.
 * Guaranteed to never return "Invalid Date".
 *
 * Rules:
 * - Today → time only (e.g. 10:45 AM)
 * - Yesterday → Yesterday, 10:45 AM
 * - Older messages → date + time (e.g. Oct 4, 10:45 AM or Oct 4 2025, 10:45 AM)
 */
export function formatMessageDate(dateInput?: string | number | null): string {
  if (!dateInput) {
    return '';
  }

  let date: Date;

  if (typeof dateInput === 'number') {
    // Unix epoch seconds vs milliseconds
    const ms = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
    date = new Date(ms);
  } else {
    const trimmed = String(dateInput).trim();
    if (!trimmed) return '';

    // Check if numeric timestamp string (e.g. "1741234567" or "1741234567000")
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const ms = num < 10000000000 ? num * 1000 : num;
      date = new Date(ms);
    } else {
      date = new Date(trimmed);
    }
  }

  // Fallback if parsing failed - NEVER return "Invalid Date"
  if (isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Today check (same year, month, date)
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return timeStr;
  }

  // Yesterday check
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  // Older messages: date + time
  const isSameYear = date.getFullYear() === now.getFullYear();
  const dateStr = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(isSameYear ? {} : { year: 'numeric' })
  });

  return `${dateStr}, ${timeStr}`;
}
