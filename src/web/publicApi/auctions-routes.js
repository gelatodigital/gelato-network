const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')
const formatUtil = require('../../helpers/formatUtil')
const _tokenPairSplit = formatUtil.tokenPairSplit
const dateUtil = require('../../helpers/dateUtil')

const addCacheHeader = require('../helpers/addCacheHeader')

const AUCTIONS_REPORT_MAX_NUM_DAYS = 15

function createRoutes ({ dxInfoService, auctionService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: '/cleared',
    get (req, res) {
      const fromDateStr = req.query.fromDate
      const toDateStr = req.query.toDate
      const period = req.query.period
      const count = req.query.count
      const { sellToken, buyToken } = req.query.tokenPair
        ? _tokenPairSplit(req.query.tokenPair)
        : { sellToken: undefined, buyToken: undefined }
      const { fromDate, toDate } = getDateRangeFromParams({
        fromDateStr, toDateStr, period
      })

      // Make sure we don't exceed the maximun number of days
      _assertMaxNumDaysAllowed(fromDate, toDate, AUCTIONS_REPORT_MAX_NUM_DAYS)

      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return auctionService.getAuctionsReportInfo({
        fromDate, toDate, sellToken, buyToken })
    }
  })

  return routes
}

function _assertMaxNumDaysAllowed (fromDate, toDate, maxNumberOfDays) {
  const numDaysDifference = dateUtil.diff(fromDate, toDate, 'days')

  // logger.debug('numDaysDifference: ', numDaysDifference)
  if (numDaysDifference > AUCTIONS_REPORT_MAX_NUM_DAYS) {
    const error = new Error('Only a range of ' + AUCTIONS_REPORT_MAX_NUM_DAYS +
      ' days is allowed between \'toDate\' and \'fromDate\'')
    error.type = 'MAX_NUM_DAYS_EXCEEDED'
    error.data = {
      fromDate,
      toDate,
      numberOfDays: numDaysDifference,
      maxNumberOfDays
    }
    error.status = 412
    throw error
  }
}

module.exports = createRoutes
