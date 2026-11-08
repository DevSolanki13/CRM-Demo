
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
  const today = dateString(
    new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ))
  );

  let year = now.getFullYear();

  let candidate =
    `${year}-${String(DEFAULT_LEAD_RECURRENCE_MONTH).padStart(2, '0')}-${String(DEFAULT_LEAD_RECURRENCE_DAY).padStart(2, '0')}`;

  if (candidate < today) {
    year++;
    candidate =
      `${year}-${String(DEFAULT_LEAD_RECURRENCE_MONTH).padStart(2, '0')}-${String(DEFAULT_LEAD_RECURRENCE_DAY).padStart(2, '0')}`;
  }

  return candidate;
}

export function getNextLeadRecurrenceDate(
  startDate,
  frequency = DEFAULT_LEAD_RECURRENCE_FREQUENCY,
  interval = DEFAULT_LEAD_RECURRENCE_INTERVAL,
  afterDate = startDate
) {
  const start = parseDate(startDate);
  const after = parseDate(afterDate);

  if (!start || !after) return null;
  if (after < start) {
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

  if (frequency === 'custom') {
    if (!Number.isInteger(interval) || interval < 1) return null;
    const elapsedDays = dayNumber(after) - dayNumber(start);
    const steps = Math.floor(elapsedDays / interval) + 1;
    return dateString(new Date(start.getTime() + steps * interval * 86_400_000));
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
