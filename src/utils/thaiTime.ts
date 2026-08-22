/**
 * Thai Timezone (Asia/Bangkok, UTC+7) Utilities and Date Formatters
 * Ensures that all dates and times across the entire platform are formatted
 * accurately according to Thailand Standard Time (ICT, UTC+7).
 */

const THAI_TIMEZONE = 'Asia/Bangkok';

/**
 * Safely parse any date/ISO string or timestamp into a valid Date object.
 */
export function parseDateSafe(input?: string | number | Date | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  
  if (typeof input === 'number') {
    return new Date(input);
  }

  if (typeof input === 'string') {
    let str = input.trim();
    if (!str) return new Date();
    
    // First try native parse
    let parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Fix for iOS Safari which cannot parse "YYYY-MM-DD HH:mm:ss"
    if (str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T');
      parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Fix for slash dates "YYYY/MM/DD" or "DD/MM/YYYY"
    if (str.includes('/')) {
      const parts = str.split(/[\/\s:]+/);
      if (parts.length >= 3) {
        // Try standard format
        const cleaned = str.replace(/\//g, '-');
        parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
  }

  return new Date();
}

/**
 * Formats a date to full Thai representation with Thai month and Buddhist Era year (พ.ศ.) or Christian era
 * e.g. "18 ส.ค. 2569 15:04 น." or "18 สิงหาคม 2569 15:04"
 */
export function formatThaiDateTime(
  input?: string | number | Date | null,
  includeSeconds = false
): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
    let dateStr = '';
    let timeStr = '';

    try {
      dateStr = d.toLocaleDateString('th-TH', {
        timeZone: THAI_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      timeStr = d.toLocaleTimeString('th-TH', {
        timeZone: THAI_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12: false,
      });
    } catch (e) {
      // Safe fallback for older WebKit / Safari engines
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      // Shift date by +7 hours to get Thailand local time
      const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
      const bkkDate = new Date(utcTime + (7 * 3600000));
      const day = bkkDate.getDate();
      const month = thaiMonths[bkkDate.getMonth()];
      const year = bkkDate.getFullYear() + 543;
      const hh = String(bkkDate.getHours()).padStart(2, '0');
      const mm = String(bkkDate.getMinutes()).padStart(2, '0');
      const ss = String(bkkDate.getSeconds()).padStart(2, '0');
      
      dateStr = `${day} ${month} ${year}`;
      timeStr = includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    }

    return `${dateStr} ${timeStr} น.`;
  } catch (err) {
    return String(input);
  }
}

/**
 * Formats a date to numeric standard Thai timezone string (YYYY-MM-DD HH:mm or DD/MM/YYYY HH:mm)
 * e.g. "2026-08-18 15:04"
 */
export function formatThaiDateTimeStandard(
  input?: string | number | Date | null
): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
    
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: THAI_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(d);
      let year = '', month = '', day = '', hour = '', minute = '';
      
      for (const part of parts) {
        if (part.type === 'year') year = part.value;
        if (part.type === 'month') month = part.value;
        if (part.type === 'day') day = part.value;
        if (part.type === 'hour') hour = part.value;
        if (part.type === 'minute') minute = part.value;
      }

      if (year && month && day) {
        return `${year}-${month}-${day} ${hour}:${minute}`;
      }
    } catch (e) {
      // fallback to manual math
    }

    // Direct UTC+7 arithmetic fallback
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bkkDate = new Date(utcTime + (7 * 3600000));
    const year = bkkDate.getFullYear();
    const month = String(bkkDate.getMonth() + 1).padStart(2, '0');
    const day = String(bkkDate.getDate()).padStart(2, '0');
    const hour = String(bkkDate.getHours()).padStart(2, '0');
    const minute = String(bkkDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch (err) {
    return String(input);
  }
}

/**
 * Formats a date to Thai date only: e.g. "18 ส.ค. 2569"
 */
export function formatThaiDate(input?: string | number | Date | null): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
    try {
      return d.toLocaleDateString('th-TH', {
        timeZone: THAI_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
      const bkkDate = new Date(utcTime + (7 * 3600000));
      return `${bkkDate.getDate()} ${thaiMonths[bkkDate.getMonth()]} ${bkkDate.getFullYear() + 543}`;
    }
  } catch {
    return String(input);
  }
}

/**
 * Formats a time in Thai timezone: e.g. "15:04 น."
 */
export function formatThaiTime(
  input?: string | number | Date | null,
  includeSeconds = false
): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
    try {
      const timeStr = d.toLocaleTimeString('th-TH', {
        timeZone: THAI_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12: false,
      });
      return `${timeStr} น.`;
    } catch (e) {
      const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
      const bkkDate = new Date(utcTime + (7 * 3600000));
      const hh = String(bkkDate.getHours()).padStart(2, '0');
      const mm = String(bkkDate.getMinutes()).padStart(2, '0');
      const ss = String(bkkDate.getSeconds()).padStart(2, '0');
      return includeSeconds ? `${hh}:${mm}:${ss} น.` : `${hh}:${mm} น.`;
    }
  } catch {
    return String(input);
  }
}

/**
 * Formats chat message time: e.g. "วันนี้ 15:04" or "18 ส.ค. 15:04"
 */
export function formatThaiChatTime(input?: string | number | Date | null): string {
  if (!input) return '';
  try {
    const d = parseDateSafe(input);
    const now = new Date();

    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bkkDate = new Date(utcTime + (7 * 3600000));

    const nowUtc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowBkk = new Date(nowUtc + (7 * 3600000));

    const isToday =
      bkkDate.getFullYear() === nowBkk.getFullYear() &&
      bkkDate.getMonth() === nowBkk.getMonth() &&
      bkkDate.getDate() === nowBkk.getDate();

    const hh = String(bkkDate.getHours()).padStart(2, '0');
    const mm = String(bkkDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    if (isToday) {
      return `${timeStr} น.`;
    }

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const dateStr = `${bkkDate.getDate()} ${thaiMonths[bkkDate.getMonth()]}`;

    return `${dateStr} ${timeStr} น.`;
  } catch {
    return '';
  }
}
