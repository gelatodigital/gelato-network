const loggerNamespace = 'dx-service:services:LiquidityService'
const AuctionLogger = require('../../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const getGitInfo = require('../../helpers/getGitInfo')
const getVersion = require('../../helpers/getVersion')
const numberUtil = require('../../helpers/numberUtil.js')
const { ONE, TEN } = numberUtil
const formatUtil = require('../../helpers/formatUtil.js')
const { formatFromWei } = formatUtil
const assert = require('assert')
const getTokenInfo = require('../helpers/getTokenInfo')

const MAXIMUM_DX_FEE = 0.005 // 0.5%
const WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS = process.env.WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS || (2 * 60 * 1000) // 2 min
// Release time if a sell is locked (never commiting because a reorg or transaction loss)
const MAXIMUM_TRANSACTION_TIME_LOCK_MILLISECONDS = process.env.MAXIMUM_TRANSACTION_TIME_LOCK_MILLISECONDS || (15 * 60 * 1000) // 15 min

class LiquidityService {
  constructor ({
    // repos
    arbitrageRepo,
    auctionRepo,
    ethereumRepo,
    priceRepo,

    // config
    buyLiquidityRulesDefault
  }) {
    assert(arbitrageRepo, '"arbitrageRepo" is required')
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    assert(priceRepo, '"priceRepo" is required')
    assert(buyLiquidityRulesDefault, '"buyLiquidityRulesDefault" is required')

    this._arbitrageRepo = arbitrageRepo
    this._auctionRepo = auctionRepo
    this._priceRepo = priceRepo
    this._ethereumRepo = ethereumRepo

    // Config
    this._buyLiquidityRules = buyLiquidityRulesDefault

    // Avoids concurrent calls that might endup buy/selling two times
    this.concurrencyCheck = {}

    // About info
    this._gitInfo = getGitInfo()
    this._version = getVersion()
  }

  async getVersion () {
    return this._version
  }

  async getAbout () {
    const auctionInfo = await this._auctionRepo.getAbout()
    const config = Object.assign({
      minimumSellVolumeDefault: await this._auctionRepo.getThresholdNewAuction()
    }, auctionInfo)

    return {
      name: 'Dutch Exchange - API',
      version: this._version,
      config,
      git: this._gitInfo
    }
  }

  async ensureBuyLiquidity ({ sellToken, buyToken, from, buyLiquidityRules, waitToReleaseTheLock = false }) {
    return this._ensureLiquidityAux({
      sellToken,
      buyToken,
      from,
      buyLiquidityRules,
      waitToReleaseTheLock,
      liquidityCheckName: 'buy'
    })
  }

  async ensureSellLiquidity ({
    sellToken,
    buyToken,
    from,
    minimumSellVolumeInUsd,
    waitToReleaseTheLock = true
  }) {
    return this._ensureLiquidityAux({
      sellToken,
      buyToken,
      from,
      minimumSellVolumeInUsd,
      liquidityCheckName: 'sell',
      waitToReleaseTheLock
    })
  }

  async _ensureLiquidityAux ({
    sellToken,
    buyToken,
    from,
    minimumSellVolumeInUsd,
    buyLiquidityRules,
    liquidityCheckName,
    waitToReleaseTheLock
  }) {
    // Define some variables to refacor sell/buy liquidity checks
    let boughtOrSoldTokensPromise, doEnsureLiquidityFnName, baseLockName,
      messageCurrentCheck, paramsCurrentCheck, minimumSellVolume
    if (liquidityCheckName === 'sell') {
      minimumSellVolume = minimumSellVolumeInUsd ? numberUtil.toBigNumber(minimumSellVolumeInUsd) : await this._auctionRepo.getThresholdNewAuction()

      doEnsureLiquidityFnName = '_doEnsureSellLiquidity'
      baseLockName = 'SELL-LIQUIDITY'
      messageCurrentCheck = 'Ensure that sell liquidity is over $%d'
      paramsCurrentCheck = [minimumSellVolume]
    } else if (liquidityCheckName === 'buy') {
      doEnsureLiquidityFnName = '_doEnsureBuyLiquidity'
      baseLockName = 'BUY-LIQUIDITY'
      messageCurrentCheck = 'Ensure that buy liquidity is met'
      paramsCurrentCheck = undefined
    } else {
      throw new Error('No known liquidity check named: ' + liquidityCheckName)
    }

    assert(from, 'The "from" account is required')

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: messageCurrentCheck,
      params: paramsCurrentCheck
    })

    const lockName = this._getAuctionLockName(baseLockName, sellToken, buyToken, from)

    const that = this
    const releaseLock = soldOrBoughtTokens => {
      // Clear concurrency lock and resolve promise
      const isError = soldOrBoughtTokens instanceof Error
      // TODO: Review
      clearTimeout(that.concurrencyCheck[lockName].timeout)

      if (isError || soldOrBoughtTokens.length === 0 || !waitToReleaseTheLock) {
        that.concurrencyCheck[lockName] = null
      } else {
        setTimeout(() => {
          that.concurrencyCheck[lockName] = null
        }, WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS)
      }

      if (isError) {
        // Error
        throw soldOrBoughtTokens
      } else {
        // Success
        return soldOrBoughtTokens
      }
    }

    // Check if there's an ongoing liquidity check
    if (this.concurrencyCheck[lockName]) {
      // We don't do concurrent liquidity checks
      // return that there was no need to sell/buy (empty array of orders)
      auctionLogger.warn({
        sellToken,
        buyToken,
        msg: `There is a concurrent %s check going on, so no aditional \
check should be done`,
        params: [liquidityCheckName]
      })
      boughtOrSoldTokensPromise = Promise.resolve([])
    } else {
      // Ensure liquidity + Create concurrency lock
      this.concurrencyCheck[lockName] = {
        transactionPromise: this[doEnsureLiquidityFnName]({
          tokenA: sellToken,
          tokenB: buyToken,
          from,
          minimumSellVolume,
          buyLiquidityRules
        }),
        timeout: setTimeout(() => {
          auctionLogger.warn({
            sellToken,
            buyToken,
            msg: `Concurrency lock had to be released after maximum timeout is reached for %s `,
            params: [liquidityCheckName]
          })
          releaseLock([])
        }, MAXIMUM_TRANSACTION_TIME_LOCK_MILLISECONDS)
      }
      boughtOrSoldTokensPromise = this.concurrencyCheck[lockName].transactionPromise
      boughtOrSoldTokensPromise
        .then(releaseLock)
        .catch(releaseLock)
    }

    return boughtOrSoldTokensPromise
  }

  async getBalancesDx ({ tokens, address }) {
    const balancesPromises = tokens.map(async token => {
      const amount = await this._auctionRepo.getBalance({ token, address })
      let amountInUSD = await this._auctionRepo
        .getPriceInUSD({
          token,
          amount
        })

      // Round USD to 2 decimals
      amountInUSD = numberUtil.roundDown(amountInUSD)

      return {
        token, amount, amountInUSD
      }
    })

    return Promise.all(balancesPromises)
  }

  async getBalancesErc20 ({ tokens, address, getAmountUsd = true }) {
    const balancesPromises = tokens.map(async token => {
      const tokenAddress = await this._auctionRepo.getTokenAddress({ token })

      const amount = await this._ethereumRepo.tokenBalanceOf({
        tokenAddress,
        account: address
      })

      let amountInUSD
      if (getAmountUsd) {
        amountInUSD = await this._auctionRepo.getPriceInUSD({
          token,
          amount
        })

        // Round USD to 2 decimals
        amountInUSD = numberUtil.roundDown(amountInUSD)
      }

      return {
        token, amount, amountInUSD
      }
    })

    return Promise.all(balancesPromises)
  }

  async _doEnsureSellLiquidity ({
    tokenA,
    tokenB,
    from,
    minimumSellVolume
  }) {
    const soldTokens = []
    const auction = { sellToken: tokenA, buyToken: tokenB }
    const [auctionIndex, auctionStart] = await Promise.all([
      this._auctionRepo.getAuctionIndex(auction),
      this._auctionRepo.getAuctionStart(auction)
    ])

    // Make sure the token pair has been added to the DX
    assert(auctionIndex > 0, `Unknown token pair: ${tokenA}-${tokenB}`)

    // Check if there is a start date
    if (auctionStart === null) {
      // We are in a waiting for funding period

      // Get the liquidity and minimum sell volume
      const { fundingA, fundingB } = await this._auctionRepo.getFundingInUSD({
        tokenA, tokenB, auctionIndex
      })

      // Check if we surplus it
      if (
        fundingA.lessThan(minimumSellVolume) ||
        fundingB.lessThan(minimumSellVolume)
      ) {
        // Not enough liquidity
        auctionLogger.info({
          sellToken: tokenA,
          buyToken: tokenB,
          msg: 'Not enough liquidity for auction %d: %s=$%d, %s=$%d',
          params: [auctionIndex, tokenA, fundingA, tokenB, fundingB],
          notify: true
        })

        let soldTokenAB, soldTokenBA
        // Ensure liquidity for both sides or the side that needs it
        if (fundingA.lessThan(minimumSellVolume)) {
          soldTokenAB = await this._sellTokenToCreateLiquidity({
            sellToken: tokenA,
            buyToken: tokenB,
            funding: fundingA,
            auctionIndex,
            from,
            minimumSellVolume
          })
          soldTokens.push(soldTokenAB)
        }
        if (fundingB.lessThan(minimumSellVolume)) {
          soldTokenBA = await this._sellTokenToCreateLiquidity({
            sellToken: tokenB,
            buyToken: tokenA,
            funding: fundingB,
            auctionIndex,
            from,
            minimumSellVolume
          })
          soldTokens.push(soldTokenBA)
        }
      } else {
        // ERROR: Why there is no auctionStart if there is enough liquidity
        // It shouldn't happen (the liquidity criteria should be the same for the SC and the bots)
        throw new Error(`There is enough liquidity but somehow there's no \
startDate for auction ${auctionIndex}: ${tokenA}: ${fundingA}\
${tokenB}: ${fundingB}. It might be a concurrency issue. Check if the error \
keeps happening`
        )
      }
    } else {
      // Not sell is required
      auctionLogger.debug({
        sellToken: tokenA,
        buyToken: tokenB,
        msg: `No sell is required, we are not in a waiting for funding state`
      })
    }

    return soldTokens
  }

  async _doEnsureBuyLiquidity ({ tokenA, tokenB, from, buyLiquidityRules }) {
    const buyLiquidityResult = []
    const auction = { sellToken: tokenA, buyToken: tokenB }
    const auctionIndex = await this._auctionRepo.getAuctionIndex(auction)

    // Make sure the token pair has been added to the DX
    assert(auctionIndex > 0, `Unknown token pair: ${tokenA}-${tokenB}`)

    const [soldTokensA, soldTokensB] = await Promise.all([
      // tokenA-tokenB: Get soldTokens
      this._getPricesAndEnsureLiquidity({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex,
        from,
        buyLiquidityRules
      }),

      // tokenB-tokenA: Get soldTokens
      this._getPricesAndEnsureLiquidity({
        sellToken: tokenB,
        buyToken: tokenA,
        auctionIndex,
        from,
        buyLiquidityRules
      })
    ])

    if (soldTokensA) {
      buyLiquidityResult.push(soldTokensA)
    }
    if (soldTokensB) {
      buyLiquidityResult.push(soldTokensB)
    }

    return buyLiquidityResult
  }

  async _getPricesAndEnsureLiquidity ({ sellToken, buyToken, auctionIndex, from, buyLiquidityRules }) {
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'auctionIndex: %d, from: %s',
      params: [auctionIndex, from]
    })
    const auctionState = await this._auctionRepo.getAuctionState({
      sellToken,
      buyToken,
      auctionIndex
    })
    // If the current auction is not cleared (not price + has)
    const {
      sellVolume,
      hasAuctionStarted,
      isClosed,
      isTheoreticalClosed
    } = auctionState

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'State of the auction: %o',
      params: [{ sellVolume: sellVolume.toNumber(), hasAuctionStarted, isClosed, isTheoreticalClosed }]
    })

    // We do need to ensure the liquidity if:
    //  * The auction has sell volume
    //  * The auction has started
    //  * Is not closed yet
    //  * Is not in theoretical closed state
    if (!sellVolume.isZero() && hasAuctionStarted) {
      if (!isClosed && !isTheoreticalClosed) {
        const [
          priceWithoutDecimals,
          currentMarketPrice,
          { decimals: sellTokenDecimals },
          { decimals: buyTokenDecimals }] = await Promise.all([
          // Get the current price for the auction
          this._auctionRepo.getCurrentAuctionPrice({
            sellToken,
            buyToken,
            auctionIndex,
            from
          }),

          // Get the market price
          this._priceRepo.getPrice({
            tokenA: sellToken,
            tokenB: buyToken
          }).then(price => ({
            numerator: numberUtil.toBigNumber(price.toString()),
            denominator: ONE
          })),

          getTokenInfo({
            auctionRepo: this._auctionRepo,
            ethereumRepo: this._ethereumRepo,
            token: sellToken
          }),
          getTokenInfo({
            auctionRepo: this._auctionRepo,
            ethereumRepo: this._ethereumRepo,
            token: buyToken
          })
        ])
        assert(currentMarketPrice, `There is no market price for ${sellToken}-${buyToken}`)

        const price = formatUtil.formatPriceWithDecimals({
          price: priceWithoutDecimals, tokenADecimals: sellTokenDecimals, tokenBDecimals: buyTokenDecimals
        })

        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'Price: %s, Market price: %s',
          params: [formatUtil.formatFraction({ fraction: price }), formatUtil.formatFraction({ fraction: currentMarketPrice })]
        })
        if (price) {
          // If there is a price, the auction is running
          return this._doBuyLiquidityUsingCurrentPrices({
            sellToken,
            buyToken,
            sellTokenDecimals,
            buyTokenDecimals,
            auctionIndex,
            from,
            buyLiquidityRules,
            currentMarketPrice,
            price,
            auctionState
          })
        }
      } else {
        // The auction is CLOSED or THEORETICALY CLOSED
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'The auction is already closed: %o',
          params: [{
            isTheoreticalClosed,
            isClosed
          }]
        })
      }
    } else {
      if (!hasAuctionStarted) {
        // Auction hasn't started
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'The auction hasn\'t started yet. Will check back later'
        })
      } else {
        // No sell volume
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: "The auction doesn't have any sell volume, so there's nothing to buy"
        })
      }
    }
  }

  // async _getCurrentAuctionPrice ({ sellToken, buyToken, auctionIndex, from }) {
  //   // Get the current price for the auction
  //   let price = await this._auctionRepo.getCurrentAuctionPrice({
  //     sellToken, buyToken, auctionIndex, from
  //   })

  //   // The auction may be running and not having price, this is because:
  //   //   - just one of the oposit auctions is running
  //   //   - We asked for the price of the not-running one
  //   if (price == null) {
  //     // We get the opposit price and return the inverse
  //     const priceOpp = await this._auctionRepo.getCurrentAuctionPrice({
  //       sellToken: buyToken,
  //       buyToken: sellToken,
  //       auctionIndex,
  //       from
  //     })

  //     if (priceOpp !== null) {
  //       price = {
  //         numerator: priceOpp.denominator,
  //         denominator: priceOpp.numerator
  //       }
  //     } else {
  //       price = null
  //     }
  //   }

  //   return price
  // }

  async _doBuyLiquidityUsingCurrentPrices ({
    sellToken,
    buyToken,
    sellTokenDecimals,
    buyTokenDecimals,
    auctionIndex,
    from,
    buyLiquidityRules,
    currentMarketPrice,
    price,
    auctionState
  }) {
    const rules = (buyLiquidityRules || this._buyLiquidityRules).map(({ marketPriceRatio, buyRatio }) => ({
      marketPriceRatio: formatUtil.formatFraction({ fraction: marketPriceRatio }),
      buyRatio: formatUtil.formatFraction({ fraction: buyRatio })
    }))
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Do ensure liquidity for auction %d. Rules: %o',
      params: [auctionIndex, rules]
    })

    let buyLiquidityOperation = null

    // Get the percentage that should be bought
    const percentageThatShouldBeBought = this._getPercentageThatShouldBeBought({
      buyLiquidityRules,
      currentMarketPrice,
      price
    })

    if (!percentageThatShouldBeBought.isZero()) {
      // Get the buy volume, and the expected buyVolume
      const { buyVolume, sellVolume } = auctionState

      // We make sure there's sell volume (otherwise there's nothing to buy)
      auctionLogger.info({
        sellToken,
        buyToken,
        msg: 'We need to ensure that %d % of the buy volume is bought. Market Price: %s, Price: %s, Relation: %d %',
        params: [
          percentageThatShouldBeBought.mul(100).toFixed(2),
          formatUtil.formatFraction({ fraction: currentMarketPrice }),
          formatUtil.formatFraction({ fraction: price }),
          _getPriceRatio(price, currentMarketPrice)
            .mul(100)
            .toFixed(2)
        ]
      })

      // Get the total sellVolume in buy tokens
      const sellVolumeInBuyTokens = sellVolume
        .mul(TEN.toPower(buyTokenDecimals - sellTokenDecimals))
        .mul(price.numerator)
        .div(price.denominator)

      // Get the buyTokens that should have been bought
      const expectedBuyVolume = percentageThatShouldBeBought
        .mul(sellVolumeInBuyTokens)

      // Get the difference between the buyVolume and the buyVolume that we
      // should have
      const buyTokensRequiredToMeetLiquidity = expectedBuyVolume
        .minus(buyVolume)
        .ceil()

      // (1 - (sellVolumeInBuyTokens - buyVolume / sellVolumeInBuyTokens)) * 100
      const boughtPercentage = ONE.minus(
        sellVolumeInBuyTokens
          .minus(buyVolume)
          .div(sellVolumeInBuyTokens)
      ).mul(100)

      // Decide if we need to meet the liquidity
      const needToEnsureLiquidity = buyTokensRequiredToMeetLiquidity.greaterThan(0)

      if (needToEnsureLiquidity) {
        const buyTokensWithFee = buyTokensRequiredToMeetLiquidity
          .div(ONE.minus(MAXIMUM_DX_FEE))

        const remainPercentage = percentageThatShouldBeBought
          .mul(100)
          .minus(boughtPercentage)

        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'The auction has %d % of the buy volume bought. So we need to buy an extra %d %',
          params: [
            boughtPercentage.toFixed(2),
            remainPercentage.toFixed(2)
          ]
        })

        // Get the price in USD for the tokens we are buying
        const amountToBuyInUSD = await this._auctionRepo.getPriceInUSD({
          token: buyToken,
          amount: buyTokensWithFee
        })

        // We need to ensure liquidity
        // Sell the missing difference
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'Posting a buy order for %d %s ($%d)',
          params: [formatFromWei(buyTokensWithFee, buyTokenDecimals), buyToken, amountToBuyInUSD]
        })
        const buyOrder = await this._auctionRepo.postBuyOrder({
          sellToken,
          buyToken,
          amount: buyTokensWithFee,
          auctionIndex,
          from
        })
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: 'Posted a buy order. Transaction: %s',
          params: [buyOrder.tx]
        })

        buyLiquidityOperation = {
          sellToken,
          buyToken,
          auctionIndex,
          amount: buyTokensWithFee,
          amountInUSD: amountToBuyInUSD
        }
      } else {
        // We meet the liquidity
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'The auction has %d % of the buy volume bought. So we are good',
          params: [
            boughtPercentage.toFixed(2)
          ]
        })
      }
    }

    return buyLiquidityOperation
  }

  _getPercentageThatShouldBeBought ({ buyLiquidityRules, currentMarketPrice, price }) {
    // Get the relation between prices
    //  priceRatio = (Pn * Cd) / (Pd * Cn)
    const priceRatio = _getPriceRatio(price, currentMarketPrice)

    const rules = (buyLiquidityRules || this._buyLiquidityRules)
      // Transform fractions to bigdecimals
      .map(threshold => ({
        marketPriceRatio: numberUtil
          .toBigNumberFraction(threshold.marketPriceRatio),
        buyRatio: numberUtil
          .toBigNumberFraction(threshold.buyRatio)
      }))
      // Sort the thresholds by buyRatio (in descendant order)
      .sort((thresholdA, thresholdB) => {
        return thresholdB.buyRatio.comparedTo(thresholdA.buyRatio)
      })

    // Get the matching rule with the highest
    //  * note that the rules aresorted by buyRatio (in descendant order)
    const buyRule = rules.find(threshold => {
      return threshold.marketPriceRatio.greaterThanOrEqualTo(priceRatio)
    })
    return buyRule ? buyRule.buyRatio : numberUtil.ZERO
  }

  async _sellTokenToCreateLiquidity ({
    sellToken,
    buyToken,
    funding,
    auctionIndex,
    from,
    minimumSellVolume
  }) {
    // decide if we sell on the auction A-B or the B-A
    //  * We sell on the auction with more liquidity
    let amountToSellInUSD = minimumSellVolume.minus(funding)

    // We round up the dollars
    amountToSellInUSD = amountToSellInUSD
      // We add the maximun fee as an extra amount
      .div(ONE.minus(MAXIMUM_DX_FEE))

    // Round USD to 2 decimals
    amountToSellInUSD = numberUtil.roundUp(amountToSellInUSD)

    // Get the amount to sell in sellToken
    const [ amountInSellTokens, { decimals: sellTokenDecimals } ] = await Promise.all([
      this._auctionRepo
        .getPriceFromUSDInTokens({
          token: sellToken,
          amountOfUsd: amountToSellInUSD
        }).then(result => {
          return result.ceil()
        }),

      getTokenInfo({
        auctionRepo: this._auctionRepo,
        ethereumRepo: this._ethereumRepo,
        token: sellToken
      })
    ])

    // Sell the missing difference
    auctionLogger.info({
      sellToken,
      buyToken,
      msg: 'Selling %d %s ($%d)',
      params: [formatFromWei(amountInSellTokens, sellTokenDecimals), sellToken, amountToSellInUSD]
    })
    const sellOrder = await this._auctionRepo.postSellOrder({
      sellToken,
      buyToken,
      amount: amountInSellTokens,
      auctionIndex,
      from
    })
    auctionLogger.info({
      sellToken,
      buyToken,
      msg: 'Posted a sell order. Transaction: %s',
      params: [sellOrder.tx]
    })

    return {
      sellToken,
      buyToken,
      auctionIndex,
      amount: amountInSellTokens,
      amountInUSD: amountToSellInUSD
    }
  }

  _getAuctionLockName (operation, sellToken, buyToken, from) {
    const sufix = sellToken < buyToken ? sellToken + '-' + buyToken : buyToken + '-' + sellToken

    return operation + sufix + from
  }
}

function _getPriceRatio (price1, price2) {
  //  priceRatio = (P1n * P2d) / (P1d * P2n)
  return price1
    .numerator
    .mul(price2.denominator)
    .div(
      price1.denominator
        .mul(price2.numerator)
    )
}

module.exports = LiquidityService
