const TIME_TO_REACH_MARKET_PRICE_MILLISECONNDS = 6 * 60 * 60 * 1000

// const numberUtil = require('../../helpers/numberUtil')
const formatUtil = require('../../helpers/formatUtil')

module.exports = function ({ logger, sellToken, buyToken, now, marketDetails }) {
  const {
    isValidTokenPair,
    state,
    isSellTokenApproved,
    isBuyTokenApproved,
    auctionIndex,
    auctionStart,
    auction,
    auctionOpp,
    sellTokenInfo,
    buyTokenInfo
  } = marketDetails

  logger.info(`\tToken pair: ${sellToken}-${buyToken}\n`)
  logger.info('\tHas the token pair been added? %s', isValidTokenPair ? 'Yes' : 'No')
  logger.info(`\tState: ${state}\n`)

  logger.info(`\tAre tokens Approved?`)
  logger.info('\t\t- %s: %s', sellToken, formatUtil.formatBoolean(isSellTokenApproved))
  logger.info('\t\t- %s: %s\n', buyToken, formatUtil.formatBoolean(isBuyTokenApproved))

  logger.info('\tState info:')
  logger.info('\t\t- auctionIndex: %s', auctionIndex)
  logger.info('\t\t- auctionStart: %s', formatUtil.formatDateTime(auctionStart))

  if (auctionStart) {
    // debug('\t\t- Blockchain time: %s', formatUtil.formatDateTime(now))
    if (now < auctionStart) {
      logger.info('\t\t- It will start in: %s', formatUtil.formatDatesDifference(auctionStart, now))
    } else {
      logger.info('\t\t- It started: %s ago', formatUtil.formatDatesDifference(now, auctionStart))
      const marketPriceTime = new Date(
        auctionStart.getTime() +
        TIME_TO_REACH_MARKET_PRICE_MILLISECONNDS
      )

      // debug('\t\t- Market price time: %s', formatUtil.formatDateTime(marketPriceTime))
      if (marketPriceTime > now) {
        logger.info('\t\t- It will reach the last auction closing price in: %s', formatUtil.formatDatesDifference(now, marketPriceTime))
      } else {
        logger.info('\t\t- It has reached market price: %s ago', formatUtil.formatDatesDifference(marketPriceTime, now))
      }
    }
  }

  if (auction) {
    _printAuctionDetails({
      auction,
      tokenA: sellTokenInfo,
      tokenB: buyTokenInfo,
      auctionIndex,
      state,
      logger
    })
  }

  if (auction) {
    _printAuctionDetails({
      auction: auctionOpp,
      tokenA: buyTokenInfo,
      tokenB: sellTokenInfo,
      auctionIndex,
      state,
      logger
    })
  }
}

function _printAuctionDetails ({ auction, tokenA, tokenB, auctionIndex, state, logger }) {
  const {
    isClosed,
    price,
    closingPrice,
    isTheoreticalClosed,
    sellVolume,
    buyVolume,
    // buyVolumesInSellTokens,
    priceRelationshipPercentage,
    boughtPercentage,
    outstandingVolume
  } = auction

  logger.info('')
  logger.info(`\tAuction ${tokenA.symbol}-${tokenB.symbol}:`)

  // printProps('\t\t', auctionProps, auction, formatters)
  let closedStatus
  if (isClosed) {
    closedStatus = 'Yes'
    if (sellVolume.isZero()) {
      closedStatus += ' (closed from start)'
    }
  } else if (isTheoreticalClosed) {
    closedStatus = 'Theoretically closed'
  } else {
    closedStatus = 'No'
  }

  logger.info('\t\tIs closed: %s', closedStatus)

  if (!sellVolume.isZero()) {
    logger.info('\t\tSell volume:')
    logger.info(`\t\t\tsellVolume: %d %s`, formatUtil.formatFromWei(sellVolume, tokenA.decimals), tokenA.symbol)
    if (auction.fundingInUSD) {
      logger.info(`\t\t\tsellVolume: %d USD`, auction.fundingInUSD)
    }

    if (price) {
      logger.info(`\t\tPrice:`)
      logger.info(
        `\t\t\tCurrent Price: %s %s/%s`,
        formatUtil.formatFraction({ fraction: price, tokenBDecimals: tokenB.decimals, tokenADecimals: tokenA.decimals }), tokenA.symbol, tokenB.symbol
      )
      if (closingPrice) {
        logger.info(`\t\t\tPrevious closing Price: %s %s/%s`,
          formatUtil.formatFraction({ fraction: closingPrice, tokenBDecimals: tokenB.decimals, tokenADecimals: tokenA.decimals }), tokenA.symbol, tokenB.symbol
        )

        logger.info(`\t\t\tPrice relation: %s`,
          priceRelationshipPercentage ? priceRelationshipPercentage.toFixed(2) + '%' : 'N/A'
        )
      }
    }
  } else {
    logger.info('\t\tSell volume: 0')
  }

  if (!sellVolume.isZero()) {
    logger.info('\t\tBuy volume:')
    logger.info(`\t\t\tbuyVolume: %d %s`, formatUtil.formatFromWei(buyVolume, tokenB.decimals), tokenB.symbol)
    logger.info(`\t\t\tBought percentage: %s %`, boughtPercentage.toFixed(4))

    const isNotInWaitingPeriod = (state.indexOf('WAITING') === -1)
    if (isNotInWaitingPeriod) {
      logger.info(`\t\t\tOutstanding volume: %d %s`,
        formatUtil.formatFromWei(outstandingVolume, tokenB.decimals), tokenB.symbol)
    }
  }
}
