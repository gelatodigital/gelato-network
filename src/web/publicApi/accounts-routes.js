const formatUtil = require('../../helpers/formatUtil')
const _tokenPairSplit = formatUtil.tokenPairSplit

const addCacheHeader = require('../helpers/addCacheHeader')

function createRoutes ({ dxInfoService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: '/:accountAddress/current-liquidity-contribution-ratio',
    get (req, res) {
      let params = { address: req.params.accountAddress }
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getCurrentFeeRatio(params)
    }
  })

  // TODO deprecated endpoint remove in future versions
  routes.push({
    path: '/:accountAddress/current-fee-ratio',
    get (req, res) {
      let params = { address: req.params.accountAddress }
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getCurrentFeeRatio(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/seller',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getSellerBalanceForCurrentAuction(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/auctions/:auctionIndex/seller',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress,
          auctionIndex: req.params.auctionIndex }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getSellerBalance(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/buyer',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getBuyerBalanceForCurrentAuction(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/auctions/:auctionIndex/buyer',
    get (req, res) {
      let tokenPair = _tokenPairSplit(req.params.tokenPair)
      let params = Object.assign(
        tokenPair,
        { address: req.params.accountAddress,
          auctionIndex: req.params.auctionIndex }
      )
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getBuyerBalance(params)
    }
  })

  routes.push({
    path: '/:accountAddress/balances/:tokenPair/claimable-tokens',
    get (req, res) {
      let { sellToken, buyToken } = _tokenPairSplit(req.params.tokenPair)
      let count = req.query.count !== undefined ? req.query.count : 10
      let params = Object.assign(
        { tokenA: sellToken,
          tokenB: buyToken,
          address: req.params.accountAddress,
          lastNAuctions: count
        })
      addCacheHeader({ res, time: CACHE_TIMEOUT_AVERAGE })
      return dxInfoService.getClaimableTokens(params)
    }
  })

  routes.push({
    path: '/:accountAddress/tokens/:tokenAddress',
    get (req, res) {
      let token = formatUtil.isHexAddress({ token: req.params.tokenAddress })
        ? req.params.tokenAddress
        : req.params.tokenAddress.toUpperCase()
      let params = Object.assign({
        token,
        address: req.params.accountAddress
      })
      addCacheHeader({ res, time: CACHE_TIMEOUT_SHORT })
      return dxInfoService.getAccountBalanceForToken(params)
    }
  })

  return routes
}

module.exports = createRoutes
