const numberUtil = require('./numberUtil')
const moment = require('moment')

const HEXADECIMAL_REGEX = /0[xX][0-9a-fA-F]+/

const DATE_FORMAT = 'D/MM/YY'
const DATE_FORMAT_FOR_PARSING = 'D/MM/YYYY' // Accepts 2 and 4 digits years
const TIME_FORMAT = 'H:mm'
const TIME_WITH_SECONDS_FORMAT = 'H:mm:ss'
const DATE_TIME_FORMAT = DATE_FORMAT + ' ' + TIME_FORMAT
const DATE_TIME_FORMAT_WITH_SECONDS = DATE_FORMAT + ' ' + TIME_WITH_SECONDS_FORMAT
const DATE_TIME_FORMAT_CSV = 'YYYY/MM/D H:mm:ss'

const getTokenOrder = require('./getTokenOrder')

function formatDate (date) {
  return date ? moment(date).format(DATE_FORMAT) : null
}

function formatDateTime (date) {
  return date ? moment(date).format(DATE_TIME_FORMAT) : null
}

function formatDateTimeWithSeconds (date) {
  return date ? moment(date).format(DATE_TIME_FORMAT_WITH_SECONDS) : null
}

function formatDateTimeCsv (date) {
  return date ? moment(date).format(DATE_TIME_FORMAT_CSV) : null
}

function parseDate (dateStr) {
  return _parseDate(dateStr, DATE_FORMAT_FOR_PARSING, 'The required format is ' +
    DATE_FORMAT + '. Example: 15-01-2018')
}

function parseDateTime (dateStr) {
  return _parseDate(dateStr, DATE_TIME_FORMAT, 'The required format is ' +
    DATE_TIME_FORMAT + '. Example: 15-01-2018 16:35')
}

function parseDateIso (dateStr, errorMessage) {
  return _parseDate(dateStr, null, 'Use a valid ISO 8601 format. Examples: 2013-02-08, 2013-02-08T09:30, 2013-02-08 09:30:26')
}

function formatDatesDifference (date1, date2) {
  const difference = moment(date1).diff(moment(date2))

  return moment
    .duration(difference)
    .humanize()
}

function formatDatesDifferenceCsv (date1, date2) {
  if (date1 && date2) {
    const milliseconds = Math.abs(date1.getTime() - date2.getTime())
    return moment
      .utc(milliseconds)
      .format('HH:mm:ss')
  } else {
    return null
  }
}

function formatDateFromNow (date) {
  return moment(date).fromNow()
}

function formatNumber (x, { thousandsSeparator = ',', decimalSeparator = '.', precision = null } = {}) {
  if (x === null || x === undefined) {
    return x
  }

  let number
  if (precision) {
    number = numberUtil.round(x, precision)
  } else {
    number = x
  }
  var parts = number.toString().split(decimalSeparator)
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
  return parts.join(decimalSeparator)
}

function formatBoolean (flag) {
  return flag ? 'Yes' : 'No'
}

function formatToWei (eth, decimals = 18) {
  if (eth) {
    return numberUtil.toWei(eth, decimals)
  } else {
    return null
  }
}

function formatFromWei (wei, decimals = 18) {
  if (wei) {
    return numberUtil.fromWei(wei, decimals)
  } else {
    return null
  }
}

function formatPriceWithDecimals ({ price, tokenBDecimals = 18, tokenADecimals = 18 }) {
  if (!price) {
    return null
  } else {
    const max = Math.max(tokenBDecimals, tokenADecimals)
    return {
      numerator: price.numerator.mul(numberUtil.TEN.toPower(max - tokenBDecimals)),
      denominator: price.denominator.mul(numberUtil.TEN.toPower(max - tokenADecimals))
    }
  }
}

function formatFraction ({ fraction, inDecimal = true, tokenBDecimals = 18, tokenADecimals = 18 }) {
  if (!fraction) {
    return null
  } else {
    const fractionInBn = numberUtil.toBigNumberFraction(fraction, false)
    const { numerator, denominator } = formatPriceWithDecimals({
      price: fractionInBn, tokenBDecimals, tokenADecimals
    })
    if (inDecimal) {
      // In decimal format
      const decimalumber = numberUtil.toBigNumberFraction({ numerator, denominator }, true)
      return formatNumber(decimalumber)
    } else {
      // In fractional format
      return formatNumber(numerator) +
        ' / ' +
        formatNumber(denominator)
    }
  }
}

function formatMarketDescriptor ({ tokenA, tokenB }) {
  const [ sellToken, buyToken ] = getTokenOrder(tokenA, tokenB)
  return sellToken + '-' + buyToken
}

function tokenPairSplit (tokenPair) {
  // Split token pair string
  let splittedPair = tokenPair.split('-')

  const _handleSymbolOrHexToken = splitted => {
    return splitted.map(token => {
      let parsedToken = token
      if (isHexAddress({ token })) {
        // In case is HEX make sure 0x is lowercase (parity issues)
        parsedToken = token.replace('0X', '0x')
      } else {
        // In case is symbol set to uppercase
        parsedToken = token.toUpperCase()
      }
      return parsedToken
    })
  }

  if (splittedPair.length === 2) {
    const [sellToken, buyToken] = _handleSymbolOrHexToken(splittedPair)
    return {
      sellToken,
      buyToken
    }
  } else {
    const error = new Error('Invalid token pair format. Valid format is <sellTokenAddress>-<buyTokenAddress>')
    error.type = 'INVALID_TOKEN_FORMAT'
    error.status = 412
    throw error
  }
}

function isHexAddress ({ token, forceError = false }) {
  if (HEXADECIMAL_REGEX.test(token)) {
    return true
  } else {
    if (forceError) {
      const error = new Error('Invalid token format. Expected Hex Address')
      error.type = 'INVALID_TOKEN_FORMAT'
      error.status = 412
      throw error
    }
    return false
  }
}

function _parseDate (dateStr, format, errorMessage) {
  const date = format ? moment(dateStr, format) : moment(dateStr, moment.ISO_8601)

  if (!date.isValid()) {
    const error = new Error('Invalid date format' + errorMessage)
    error.data = {
      date: dateStr
    }
    error.type = 'DATE_FORMAT'
    error.status = 412

    throw error
  } else {
    return date.toDate()
  }
}

module.exports = {
  tokenPairSplit
}

module.exports = {
  formatNumber,
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  formatDateTimeCsv,
  formatDatesDifferenceCsv,
  formatDatesDifference,
  formatDateFromNow,
  formatBoolean,
  isHexAddress,
  parseDate,
  parseDateTime,
  parseDateIso,
  formatFromWei,
  formatToWei,
  formatFraction,
  formatPriceWithDecimals,
  formatMarketDescriptor,
  tokenPairSplit
}
