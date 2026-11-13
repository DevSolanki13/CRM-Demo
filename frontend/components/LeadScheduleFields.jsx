import { getDefaultLeadRecurrenceDate, reminderOffsets } from '../../shared/leadRecurrence.js';

const inputClass = 'mt-1 w-full rounded-lg border border-[#E3E6EA] bg-white px-3 py-2.5 text-sm text-[#12161C] focus-visible:outline-2 focus-visible:outline-[#1D4E63]';

export function LeadScheduleFields({ value, onChange, existingSchedule = false }) {
  const set = patch => onChange({ ...value, ...patch });
  const frequency = value.recurrenceFrequency || 'monthly';
  const offsets = reminderOffsets(value);
  return <fieldset className="space-y-3 rounded-xl border border-[#D8E8EF] bg-[#F8FBFC] p-4 text-sm">
    <legend className="px-1 font-semibold text-[#1D4E63]">Purchase schedule</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>{existingSchedule ? 'Future schedule anchor date' : 'Expected first purchase date'}
        <input className={inputClass} type="date" required
          value={value.recurrenceDate || getDefaultLeadRecurrenceDate()} onChange={event => set({ recurrenceDate: event.target.value })} />
      </label>
      <label>Repeat
        <select className={inputClass} value={frequency} onChange={event => set({ recurrenceFrequency: event.target.value, recurrenceInterval: 1 })}>
          <option value="monthly">Every number of months</option><option value="weekly">Every number of weeks</option>
          <option value="monthly_dates">Selected dates each month</option><option value="custom">Every number of days</option>
          <option value="yearly">Every year</option>
        </select>
      </label>
    </div>
    {!['monthly_dates', 'yearly'].includes(frequency) && <label className="block">Repeat every ({frequency === 'monthly' ? 'months' : frequency === 'weekly' ? 'weeks' : 'days'})
      <input className={inputClass} type="number" min="1" max="3650" required value={value.recurrenceInterval ?? 1}
        onChange={event => set({ recurrenceInterval: event.target.value === '' ? '' : Number(event.target.value) })} />
    </label>}
    {frequency === 'monthly_dates' && <fieldset><legend>Days of the month — choose one or more</legend>
      <div className="mt-2 grid grid-cols-7 gap-1.5">{Array.from({ length: 31 }, (_, index) => index + 1).map(day => <label key={day} className="flex min-h-10 items-center justify-center gap-1 rounded border border-[#D8E8EF] bg-white text-xs">
        <input type="checkbox" checked={(value.recurrenceDays || []).includes(day)} onChange={event => set({ recurrenceDays: event.target.checked
          ? [...(value.recurrenceDays || []), day] : value.recurrenceDays.filter(item => item !== day) })} />{day}
      </label>)}</div><p className="mt-2 text-xs text-[#5B6472]">Dates beyond the end of a short month use its last day.</p>
    </fieldset>}
    <p className="text-xs leading-relaxed text-[#5B6472]">Reminders appear in Tasks {offsets.join(' and ')} days before the expected purchase. A cycle stays open until its outcome is recorded. {existingSchedule && 'Schedule changes apply to future cycles. Use Update cycle to change the current expected purchase date.'}</p>
  </fieldset>;
}
