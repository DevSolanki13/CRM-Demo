
export const DEFAULT_LEAD_RECURRENCE_MONTH = 12;
export const DEFAULT_LEAD_RECURRENCE_DAY = 1;
export const DEFAULT_LEAD_RECURRENCE_FREQUENCY = 'monthly';
export const DEFAULT_LEAD_RECURRENCE_INTERVAL = 1;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const parseDate = value => {
  if (!datePattern.test(String(value || ''))) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const dateString = date => date.toISOString().slice(0, 10);
const dayNumber = date => Math.floor(date.getTime() / 86_400_000);

const daysInMonth = (year, monthIndex) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const addMonths = (date, months) => {
  const totalMonths =
    date.getUTCFullYear() * 12 + date.getUTCMonth() + months;

  const year = Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month));

  return new Date(Date.UTC(year, month, day));
};

export function getDefaultLeadRecurrenceDate(now = new Date()) {
  return dateString(
    new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ))
  );

}

export function getNextLeadRecurrenceDate(
  startDate,
  frequency = DEFAULT_LEAD_RECURRENCE_FREQUENCY,
  interval = DEFAULT_LEAD_RECURRENCE_INTERVAL,
  afterDate = startDate,
  selectedDays = []
) {
  const start = parseDate(startDate);
  const after = parseDate(afterDate);

  if (!start || !after) return null;
  if (after < start && frequency !== 'monthly_dates') {
    return dateString(start);
  }

  if (frequency === 'yearly') {
    let year = after.getUTCFullYear();
    let candidate = new Date(Date.UTC(
      year,
      start.getUTCMonth(),
      Math.min(start.getUTCDate(), daysInMonth(year, start.getUTCMonth()))
    ));

    if (candidate <= after) {
      year++;
      candidate = new Date(Date.UTC(
        year,
        start.getUTCMonth(),
        Math.min(start.getUTCDate(), daysInMonth(year, start.getUTCMonth()))
      ));
    }

    return dateString(candidate);
  }

  if (frequency === 'monthly_dates') {
    if (!selectedDays.length || selectedDays.some(day => !Number.isInteger(day) || day < 1 || day > 31)) return null;
    for (let offset = 0; offset < 2; offset++) {
      const base = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth() + offset, 1));
      const days = [...new Set(selectedDays.map(day => Math.min(day, daysInMonth(base.getUTCFullYear(), base.getUTCMonth()))))].sort((a, b) => a - b);
      for (const day of days) {
        const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day));
        if (candidate > after && candidate >= start) return dateString(candidate);
      }
    }
    return null;
  }

  if (frequency === 'custom' || frequency === 'weekly') {
    if (!Number.isInteger(interval) || interval < 1) return null;
    const stepDays = frequency === 'weekly' ? interval * 7 : interval;
    const elapsedDays = dayNumber(after) - dayNumber(start);
    const steps = Math.floor(elapsedDays / stepDays) + 1;
    return dateString(new Date(start.getTime() + steps * stepDays * 86_400_000));
  }

  if (frequency !== 'monthly') return null;
  const monthsInterval = Number.isInteger(interval) && interval > 0
    ? interval
    : DEFAULT_LEAD_RECURRENCE_INTERVAL;
  let monthsPassed =
    (after.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    after.getUTCMonth() - start.getUTCMonth();

  let steps = Math.floor(monthsPassed / monthsInterval);

  let candidate = addMonths(start, steps * monthsInterval);

  if (candidate <= after) {
    steps++;
    candidate = addMonths(start, steps * monthsInterval);
  }

  return dateString(candidate);
}

export const CYCLE_OUTCOMES = {
  attempted: 'Contact attempted', awaiting: 'Awaiting response', confirmed: 'Purchase confirmed',
  postponed: 'Rescheduled / postponed', not_buying: 'Not buying this cycle', purchased: 'Purchase received',
};
export const CLOSED_CYCLE_STATUSES = ['not_buying', 'purchased'];
export const isRecurringTask = task => /^recurrence(?:-review|-action)?:/.test(typeof task === 'string' ? task : task.id);

export function shiftDate(value, days) {
  const date = parseDate(value);
  return date ? dateString(new Date(date.getTime() + days * 86_400_000)) : null;
}

export function recurrenceLabel(lead) {
  const interval = lead.recurrenceInterval || 1;
  if (lead.recurrenceFrequency === 'monthly_dates') return `Monthly on ${[...(lead.recurrenceDays || [])].sort((a, b) => a - b).join(', ')}`;
  if (lead.recurrenceFrequency === 'yearly') return 'Every year';
  const unit = lead.recurrenceFrequency === 'weekly' ? 'week' : lead.recurrenceFrequency === 'custom' ? 'day' : 'month';
  return `Every ${interval} ${unit}${interval === 1 ? '' : 's'}`;
}

export function reminderOffsets(lead) {
  const frequency = lead.recurrenceFrequency;
  let gap = frequency === 'weekly' ? 7 * (lead.recurrenceInterval || 1)
    : frequency === 'custom' ? (lead.recurrenceInterval || 1) : 30;
  if (frequency === 'monthly_dates' && lead.recurrenceDays?.length > 1) {
    const days = [...new Set(lead.recurrenceDays)].sort((a, b) => a - b);
    gap = Math.min(...days.slice(1).map((day, index) => day - days[index]), 28 - days.at(-1) + days[0]);
  }
  return gap >= 20 ? [10, 5] : [...new Set([Math.max(1, Math.min(3, Math.floor(gap / 2))), 1])];
}
