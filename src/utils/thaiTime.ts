const THAI_TIMEZONE = 'Asia/Bangkok';

export function parseDateSafe(input?: string | number | Date | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  
  if (typeof input === 'number') {
    return new Date(input);
  }

  if (typeof input === 'string') {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export function formatThaiDateTime(
  input?: string | number | Date | null,
  includeSeconds = false
): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
    const dateStr = d.toLocaleDateString('th-TH', {
      timeZone: THAI_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const timeStr = d.toLocaleTimeString('th-TH', {
      timeZone: THAI_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false,
    });

    return `${dateStr} ${timeStr} น.`;
  } catch {
    return String(input);
  }
}

export function formatThaiDateTimeStandard(
  input?: string | number | Date | null
): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
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

    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return String(input);
  }
}

export function formatThaiDate(input?: string | number | Date | null): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
    return d.toLocaleDateString('th-TH', {
      timeZone: THAI_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(input);
  }
}

export function formatThaiTime(
  input?: string | number | Date | null,
  includeSeconds = false
): string {
  if (!input) return '-';
  try {
    const d = parseDateSafe(input);
    const timeStr = d.toLocaleTimeString('th-TH', {
      timeZone: THAI_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false,
    });
    return `${timeStr} น.`;
  } catch {
    return String(input);
  }
}

export function formatThaiChatTime(input?: string | number | Date | null): string {
  if (!input) return '';
  try {
    const d = parseDateSafe(input);
    const now = new Date();

    const isToday =
      d.toLocaleDateString('en-GB', { timeZone: THAI_TIMEZONE }) ===
      now.toLocaleDateString('en-GB', { timeZone: THAI_TIMEZONE });

    const timeStr = d.toLocaleTimeString('th-TH', {
      timeZone: THAI_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (isToday) {
      return `${timeStr} น.`;
    }

    const dateStr = d.toLocaleDateString('th-TH', {
      timeZone: THAI_TIMEZONE,
      month: 'short',
      day: 'numeric',
    });

    return `${dateStr} ${timeStr} น.`;
  } catch {
    return '';
  }
}
