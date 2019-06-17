const moment = require('moment')

function addPeriod (date, amount, period) {
  return moment(date)
    .add(amount, period)
    .toDate()
}

function toStartOf (date, period) {
  return moment(date)
    .startOf(period)
    .toDate()
}

function toEndOf (date, period) {
  return moment(date)
    .endOf(period)
    .toDate()
}

function diff (date1, date2, period) {
  return moment(date2)
    .diff(date1, period)
}

function isNowBetweenPeriod (date1, date2, format) {
  const moment1 = _newMoment(date1, format)
  const moment2 = _newMoment(date2, format)
  return moment().isBetween(moment1, moment2)
}

function _newMoment (date, format) {
  return moment(date, format)
}

module.exports = {
  addPeriod,
  toStartOf,
  toEndOf,
  diff,
  isNowBetweenPeriod
}
