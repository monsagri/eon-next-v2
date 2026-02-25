import { format, isValid, parseISO } from 'date-fns'

const DATE_TIME_FORMAT = 'EEE d MMM, HH:mm'

/** Format an ISO date-time for display in the user's local time zone. */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '—'
  }

  const parsed = parseISO(value)
  if (!isValid(parsed)) {
    return value
  }

  return format(parsed, DATE_TIME_FORMAT)
}

/** Format an ISO date-time range for display. */
export const formatDateTimeRange = (
  start: string | null | undefined,
  end: string | null | undefined
): string => {
  const formattedStart = formatDateTime(start)
  if (!end) {
    return formattedStart
  }

  return `${formattedStart} → ${formatDateTime(end)}`
}
