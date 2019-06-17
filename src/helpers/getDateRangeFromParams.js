const formatUtil = require('./formatUtil')
const dateUtil = require('./dateUtil')
const validPeriods = [ 'today', 'yesterday', 'week', 'last-week', 'current-week' ]

function getDateRangeFromParams ({
  fromDateStr,
  toDateStr,
  period
}) {
  let toDate, fromDate
  if (fromDateStr && toDateStr) {
    fromDate = formatUtil.parseDateIso(fromDateStr)
    toDate = formatUtil.parseDateIso(toDateStr)
  } else if (period) {
    const today = new Date()

    if (validPeriods.indexOf(period) === -1) {
      throwUnknownPeriod(period)
    }

    switch (period) {
      case 'today':
        fromDate = today
        toDate = today
        break

      case 'yesterday':
        const yesterday = dateUtil.addPeriod(today, -1, 'days')
        fromDate = yesterday
        toDate = yesterday
        break

      case 'week':
        const oneWeekAgo = dateUtil.addPeriod(today, -7, 'days')
        fromDate = oneWeekAgo
        toDate = today
        break

      case 'last-week':
        const lastWeek = dateUtil.addPeriod(today, -1, 'weeks')
        fromDate = dateUtil.toStartOf(lastWeek, 'isoWeek')
        toDate = dateUtil.toEndOf(lastWeek, 'isoWeek')
        break

      case 'current-week':
        fromDate = dateUtil.toStartOf(today, 'isoWeek')
        toDate = dateUtil.toEndOf(today, 'isoWeek')
        break

      default:
        throwUnknownPeriod(period)
    }
  } else {
    const error = new Error("Either 'from-date' and 'to-date' params or 'period' params, are required.")
    error.type = 'DATE_RANGE_INVALID'
    error.data = {
      fromDate: fromDateStr || null,
      toDate: toDateStr || null
    }
    error.status = 412
    throw error
  }

  // We include the fromDate day amd the toDate day in the date range
  fromDate = dateUtil.toStartOf(fromDate, 'day')
  toDate = dateUtil.toEndOf(toDate, 'day')

  // Validate that the range is valid
  if (fromDate <= toDate) {
    return { fromDate, toDate }
  } else {
    const error = new Error("'toDate' must be greater than 'fromDate")
    error.type = 'DATE_RANGE_INVALID'
    error.data = {
      fromDate,
      toDate
    }
    error.status = 412
    throw error
  }
}

function throwUnknownPeriod (period) {
  const error = new Error(`Unknown 'period': ${period}. Valid values are: ${validPeriods.join(', ')}`)
  error.type = 'DATE_RANGE_INVALID'
  error.data = { period }
  error.status = 412

  throw error
}

module.exports = getDateRangeFromParams
