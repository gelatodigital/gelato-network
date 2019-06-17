const loggerNamespace = 'dx-service:services:ArbitrageService'
const AuctionLogger = require('../../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const assert = require('assert')
const numberUtil = require('../../helpers/numberUtil')
const formatUtil = require('../../helpers/formatUtil')
const getOutstandingVolume = require('../helpers/getOutstandingVolume')
const getTokenInfo = require('../helpers/getTokenInfo')

const WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS = process.env.WAIT_TO_RELEASE_SELL_LOCK_MILLISECONDS || (2 * 60 * 1000) // 2 min
const UNISWAP_TO_DUTCHX_GAS_COST_ESTIMATE = 559830
const DUTCHX_TO_UNISWAP_GAS_COST_ESTIMATE = 565134

const INITIAL_SPEND_INCREMENT = numberUtil.toBigNumber(1e17) // Used to increment the spend amount in DutchX
const MINIMUM_SPEND_INCREMENT = numberUtil.toBigNumber(1e6) // Used as minimum valid increment to check spend amount in DutchX

const UNISWAP_FEE = 0.003

class ArbitrageService {
  constructor ({
    arbitrageRepo,
    auctionRepo,
    ethereumRepo,
    markets
  }) {
    assert(arbitrageRepo, '"auctionRepo" is required')
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    assert(markets, '"markets" is required')

    this._arbitrageRepo = arbitrageRepo
    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets

    // Avoids concurrent calls that might endup buy/selling two times
    this.concurrencyCheck = {}
  }

  async checkUniswapArbitrage ({
    sellToken,
    buyToken,
    from,
    arbitrageContractAddress,
    minimumProfitInUsd = 0,
    maximizeVolume = true,
    waitToReleaseTheLock = false
  }) {
    return this._checkArbitrageAux({
      sellToken,
      buyToken,
      from,
      arbitrageContractAddress,
      minimumProfitInUsd,
      maximizeVolume,
      waitToReleaseTheLock,
      arbitrageCheckName: 'uniswap'
    })
  }

  async _checkArbitrageAux ({
    sellToken,
    buyToken,
    from,
    arbitrageContractAddress,
    minimumProfitInUsd,
    maximizeVolume,
    arbitrageCheckName,
    waitToReleaseTheLock
  }) {
    // Define some variables to refacor sell/buy arbitrage checks
    let boughtOrSoldTokensPromise, doArbitrageCheckFnName, baseLockName,
      messageCurrentCheck, paramsCurrentCheck

    if (arbitrageCheckName === 'uniswap') {
      doArbitrageCheckFnName = '_doCheckArbitrageUniswap'
      baseLockName = 'ARBITRAGE-LIQUIDITY'
      messageCurrentCheck = 'Check Uniswap arbitrage opportunity'
      paramsCurrentCheck = undefined
    } else {
      throw new Error('No known arbitrage check named: ' + arbitrageCheckName)
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
        msg: `There is a concurrent %s arbitrage check going on, so no aditional \
check should be done`,
        params: [arbitrageCheckName]
      })
      boughtOrSoldTokensPromise = Promise.resolve([])
    } else {
      // Ensure liquidity + Create concurrency lock
      this.concurrencyCheck[lockName] = this[doArbitrageCheckFnName]({
        tokenA: sellToken,
        tokenB: buyToken,
        from,
        arbitrageContractAddress,
        minimumProfitInUsd,
        maximizeVolume
      })
      boughtOrSoldTokensPromise = this.concurrencyCheck[lockName]
      boughtOrSoldTokensPromise
        .then(releaseLock)
        .catch(releaseLock)
    }

    return boughtOrSoldTokensPromise
  }

  async _doCheckArbitrageUniswap ({
    tokenA, tokenB, from, arbitrageContractAddress, minimumProfitInUsd, maximizeVolume }) {
    const results = []
    const auction = { sellToken: tokenA, buyToken: tokenB }

    // trigger arbitrage by token and amount
    // on dutch opportunity
    // on uniswap opportunity

    const auctionIndex = await this._auctionRepo.getAuctionIndex(auction)
    // Make sure the token pair has been added to the DX
    assert(auctionIndex > 0, `Unknown token pair: ${tokenA}-${tokenB}`)

    // tokenA-tokenB: Get soldTokens
    const soldTokensA = await this._getPricesAndAttemptArbitrage({
      sellToken: tokenA,
      buyToken: tokenB,
      auctionIndex,
      from,
      arbitrageContractAddress,
      minimumProfitInUsd,
      maximizeVolume
    })

    // tokenB-tokenA: Get soldTokens
    const soldTokensB = await this._getPricesAndAttemptArbitrage({
      sellToken: tokenB,
      buyToken: tokenA,
      auctionIndex,
      from,
      arbitrageContractAddress,
      minimumProfitInUsd,
      maximizeVolume
    })

    if (soldTokensA) {
      results.push(soldTokensA)
    }
    if (soldTokensB) {
      results.push(soldTokensB)
    }

    // if there are some results, there may be more. Try to run again with the
    // just gained Ether. Keep doing this until there is no more arbitrage
    // (no results) then return all results

    // FIXME this logic is too agresive for Mainnet. (Double transaction issue)
    // Nodes are slow so they send a transaction with the same amounts twice because state hasn't been updated yet

    // if (results.length > 0) {
    //   let more = await this._doCheckArbitrageUniswap({
    //     tokenA, tokenB, from, arbitrageContractAddress, minimumProfitInUsd, maximizeVolume })
    //   if (more.length) results.push(...more)
    // }

    return results
  }

  async _getPricesAndAttemptArbitrage ({
    buyToken, sellToken, auctionIndex, from, arbitrageContractAddress, minimumProfitInUsd, maximizeVolume }) {
    // auctionLogger.debug({
    //   sellToken,
    //   buyToken,
    //   msg: 'Step 0 - Start getting the prices and attempt arbitrage (before getting auction state)',
    //   params: []
    // })
    const {
      sellVolume,
      hasAuctionStarted,
      isClosed,
      isTheoreticalClosed
    } = await this._auctionRepo.getAuctionState({
      sellToken,
      buyToken,
      auctionIndex
    })

    // We need to check arbitrage opportunity if:
    //  * The auction has sell volume
    //  * The auction has started
    //  * Is not closed yet
    //  * Is not in theoretical closed state
    if (!sellVolume.isZero() && hasAuctionStarted) {
      if (!isClosed && !isTheoreticalClosed) {
        // get the current price for our token pair on the dutchX
        // it is buyToken per sellToken, so it tells us that
        // price = buyerToken / sellerToken
        // result = buytoken / price
        const {
          numerator, // buyVolumes[sellToken][buyToken]
          denominator // sellVolumesCurrent[sellToken][buyToken]
        } = await this._auctionRepo.getCurrentAuctionPrice({
          sellToken,
          buyToken,
          auctionIndex,
          from
        })
        const dutchPrice = numerator.div(denominator)

        // When we buy any token with WETH and then we get WETH back in Uniswap
        // we call it a dutch attempt.
        const dutchAttempt = this._auctionRepo.isTokenEth(buyToken)

        // now we get the current state of the Uniswap exchange for our token pair
        const {
          inputBalance, // our current sellToken on DutchX
          outputBalance // our current buyToken on DutchX
        } = await this._arbitrageRepo.getUniswapBalances({ sellToken, buyToken })

        let uniswapPrice = outputBalance.div(inputBalance) // buyToken per sellToken

        // Get etherToken address
        const etherTokenAddress = await this._auctionRepo.getTokenAddress({ token: 'WETH' })
        // next we check our arbitrage contract Ether balance
        // to see what the maximum amount we can spend is
        let maxEtherToSpend = await this._auctionRepo.getBalance({
          token: etherTokenAddress,
          address: arbitrageContractAddress
        })

        if (maxEtherToSpend.eq(0)) {
          auctionLogger.warn({
            sellToken,
            buyToken,
            msg: `Ether balance (${etherTokenAddress}) is zero on account \
${arbitrageContractAddress} (Arbitrage contract) using DutchX contract \
${this._auctionRepo._dx.address} Please deposit Ether`
          })
          return null
        }

        // If DutchX prices are lower than Uniswap prices
        if (dutchPrice.lt(uniswapPrice)) {
          auctionLogger.debug({
            sellToken,
            buyToken,
            msg: 'Start the buy attempt in DutchX (dutchAttempt): %s \nCurrent prices: \n%O',
            params: [
              dutchAttempt, {
                theoreticalUniswapPrice: uniswapPrice.toString(10) + ` ${buyToken} per ${sellToken}`,
                theoreticalDutchPrice: dutchPrice.toString(10) + ` ${buyToken} per ${sellToken}`
              }]
          })

          // dutchOpportunity
          // We buy the ERC20 token in the DutchX
          if (dutchAttempt) {
            return this._doDutchAttemptUniswap({
              sellToken,
              buyToken,
              auctionIndex,
              from,
              maxEtherToSpend,
              maximizeVolume,
              inputBalance,
              outputBalance,
              dutchPrice,
              etherTokenAddress,
              arbitrageContractAddress,
              minimumProfitInUsd
            })
          } else if (this._auctionRepo.isTokenEth(sellToken)) {
            // We are the buyer. If the seller token is Ether that means the buyer
            // token is some real token. We use the buyer token to get etherToken from
            // the DutchX. If we want Ether from DutchX, it means we would have bought
            // some token cheaply from Uniswap. This would have been an opportunity on Uniswap.
            // a uniswapOpportunity...
            return this._doUniswapAttemptUniswap({
              sellToken,
              buyToken,
              auctionIndex,
              from,
              maxEtherToSpend,
              maximizeVolume,
              inputBalance,
              outputBalance,
              dutchPrice,
              etherTokenAddress,
              arbitrageContractAddress,
              minimumProfitInUsd
            })
          }
        }
        // this will be reached if the amount returned from getDutchSpendAmount
        // was 0 on either opportunity or DutchX price is greater than Uniswap Price
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'No arbitrage opportunity'
        })
        return null
      } else {
        // The auction is CLOSED or THEORETICALY CLOSED
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: 'The auction is already closed: \n%O',
          params: [{
            isTheoreticalClosed,
            isClosed
          }]
        })
      }
    } else {
      // No sell volume
      auctionLogger.debug({
        sellToken,
        buyToken,
        msg: 'The auction doesn\'t have any sell volume, so there\'s nothing to buy'
      })
    }
  }

  async _estimateGasCosts (attempt) {
    const { fastGasPrice } = await this._arbitrageRepo._getGasPrices()
    let gasAmount
    switch (attempt) {
      case 'dutchAttempt':
        gasAmount = DUTCHX_TO_UNISWAP_GAS_COST_ESTIMATE
        break
      case 'uniswapAttempt':
        gasAmount = UNISWAP_TO_DUTCHX_GAS_COST_ESTIMATE
        break
    }
    return numberUtil.toBigNumber(gasAmount).mul(fastGasPrice)
  }

  async _doDutchAttemptUniswap ({
    sellToken,
    buyToken,
    auctionIndex,
    from,
    maxEtherToSpend,
    maximizeVolume,
    inputBalance,
    outputBalance,
    dutchPrice,
    etherTokenAddress,
    arbitrageContractAddress,
    minimumProfitInUsd
  }) {
    // gasCosts is the amount of profit needed from the arbitrage to pay for gas costs
    const [
      gasCosts,
      owlAllowance,
      owlBalance,
      ethUSDPrice
    ] = await Promise.all([
      this._estimateGasCosts('dutchAttempt'),
      this._auctionRepo._tokens.OWL.allowance(from, this._auctionRepo._dx.address),
      this._auctionRepo.getBalance({ token: 'OWL', address: from }),
      this._auctionRepo.getPriceEthUsd()
    ])

    let uniswapPrice = outputBalance.div(inputBalance) // buyToken per sellToken

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Attempt Dutch Opportunity with `maxEtherToSpend` = %d ETH',
      params: [
        numberUtil.fromWei(maxEtherToSpend).toString(10)
      ]
    })

    const outstandingVolume = await this.getOutstandingVolume({
      sellToken, buyToken, auctionIndex
    })

    // on a dutchOpportunity the maxToSpend remains as maxEtherAmount. In this case is the
    // maximum amount of Ether we should spend on this opportunity to make a profit
    let amount = await this.getDutchSpendAmount({
      dutchPrice,
      maxToSpend: maxEtherToSpend,
      inputBalance, // sellToken balance
      outputBalance, // buyToken balance
      maximizeVolume,
      gasCosts,
      isDutchXOpportunity: true,
      from,
      sellToken,
      buyToken,
      auctionIndex,
      owlAllowance,
      owlBalance,
      ethUSDPrice
    })

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Step 1 - Get DutchSpendAmount %s',
      params: [
        numberUtil.fromWei(amount).toString(10)
      ]
    })

    let { closesAuction, amountAfterFee } = await this._auctionRepo.getCurrentAuctionPriceWithFees({
      sellToken, buyToken, auctionIndex, amount, from, owlAllowance, owlBalance, ethUSDPrice })
    const tokensExpectedFromDutch = amountAfterFee.div(dutchPrice)

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Step 2 - Get amountAfterFee = %s and tokensExpectedFromDutch = %s',
      params: [
        numberUtil.fromWei(amountAfterFee).toString(10),
        numberUtil.fromWei(tokensExpectedFromDutch).toString(10)
      ]
    })

    if (closesAuction) {
      amount = amountAfterFee
    }

    // how much Ether would be returned after selling the sellToken on Uniswap
    let uniswapExpected = amount.gt(0)
      ? await this._arbitrageRepo.getTokenToEthInputPrice(
        sellToken, tokensExpectedFromDutch)
      : numberUtil.toBigNumber('0')

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Step 3 - Get Uniswap expected amount %s',
      params: [
        numberUtil.fromWei(uniswapExpected).toString(10)
      ]
    })

    const expectedProfit = uniswapExpected.sub(amount)// .sub(gasCosts)
    const expectedProfitInUsd = await this._auctionRepo.getPriceInUSD({
      token: buyToken,
      amount: expectedProfit
    })

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Data to evaluate DutchX Opportunity: \n %O',
      params: [{
        outstandingVolume: numberUtil.fromWei(outstandingVolume).toString(),
        amount: numberUtil.fromWei(amount).toString(10),
        amountAfterFee: numberUtil.fromWei(amountAfterFee).toString(10),
        closesAuction,
        // gasCosts: numberUtil.fromWei(gasCosts).toString(10) + ' ETH',
        tokensExpectedFromDutch: numberUtil.fromWei(tokensExpectedFromDutch).toString(10),
        uniswapExpected: numberUtil.fromWei(uniswapExpected).toString(10),
        expectedProfit: numberUtil.fromWei(expectedProfit).toString(10),
        expectedProfitInUsd: expectedProfitInUsd.toString(10) + ' USD'
      }]
    })

    // if the amount to spend is 0 there is no opportunity
    // otherwise execute the opportunity
    if (amount.gt(0) && expectedProfitInUsd.gt(minimumProfitInUsd)) {
      dutchPrice = amount.mul(dutchPrice).div(amountAfterFee)
      uniswapPrice = uniswapExpected.div(tokensExpectedFromDutch)
      auctionLogger.debug({
        sellToken,
        buyToken,
        msg: 'Making a DutchX opportunity transaction: \n%O',
        params: [{
          balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' ETH',
          amount: numberUtil.fromWei(amount).toString(10) + ' ETH',
          uniswapExpected: numberUtil.fromWei(uniswapExpected).toString(10) + ' ETH',
          tokensExpectedFromDutch: numberUtil.fromWei(tokensExpectedFromDutch).toString(10) + ' Tokens',
          expectedProfit: numberUtil.fromWei(expectedProfit).toString(10) + ' ETH',
          uniswapPrice: uniswapPrice.toString(10) + ' WEI / token',
          dutchPrice: dutchPrice.toString(10) + ' WEI / token'
        }]
      })

      const tx = await this._arbitrageRepo.dutchOpportunity({
        arbToken: sellToken,
        amount,
        from,
        arbitrageContractAddress
      })

      const balanceAfter = await this._auctionRepo.getBalance({
        token: etherTokenAddress,
        address: arbitrageContractAddress
      })

      const actualProfit = balanceAfter.sub(maxEtherToSpend)
      auctionLogger.info({
        sellToken,
        buyToken,
        msg: 'Completed a DutchX opportunity: \n%O',
        params: [{
          balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' WETH',
          balanceAfter: numberUtil.fromWei(balanceAfter).toString(10) + ' WETH',
          actualProfit: numberUtil.fromWei(actualProfit).toString(10) + ' WETH',
          actualProfitUSD: numberUtil.fromWei(actualProfit).mul(ethUSDPrice).toString(10) + ' USD'
        }]
      })
      return {
        type: 'Dutch Opportunity',
        sellToken,
        buyToken,
        amount,
        expectedProfit,
        actualProfit,
        dutchPrice,
        uniswapPrice,
        ethUSDPrice,
        tx
      }
    }
  }

  async _doUniswapAttemptUniswap ({
    sellToken,
    buyToken,
    auctionIndex,
    from,
    maximizeVolume,
    maxEtherToSpend,
    inputBalance,
    outputBalance,
    dutchPrice,
    etherTokenAddress,
    arbitrageContractAddress,
    minimumProfitInUsd
  }) {
    // gasCosts is the amount of profit needed from the arbitrage to pay for gas costs
    const [
      gasCosts,
      owlAllowance,
      owlBalance,
      ethUSDPrice
    ] = await Promise.all([
      this._estimateGasCosts('uniswapAttempt'),
      this._auctionRepo._tokens.OWL.allowance(from, this._auctionRepo._dx.address),
      this._auctionRepo.getBalance({ token: 'OWL', address: from }),
      this._auctionRepo.getPriceEthUsd()
    ])

    let uniswapPrice = outputBalance.div(inputBalance) // buyToken per sellToken

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Attempt Uniswap Opportunity with `maxEtherToSpend` = %d ETH',
      params: [
        numberUtil.fromWei(maxEtherToSpend).toString(10)
      ]
    })

    const outstandingVolume = await this.getOutstandingVolume({
      sellToken, buyToken, auctionIndex
    })

    // maxToSpend is referring to the maximum amount of buyTokens on DutchX.
    // when the buyToken is an actual token instead of Ether, it means that
    // maxToSpend will be the result of spending all available Ether on Uniswap.
    const maxToSpend = this.getInputPrice(maxEtherToSpend, inputBalance, outputBalance)

    // tokenAmount is the maximum amount of buyToken we should spend on
    // the DutchX on this opportunity to make a profit
    let tokenAmount = await this.getDutchSpendAmount({
      dutchPrice,
      maxToSpend,
      inputBalance, // sellToken balance
      outputBalance, // buyToken balance
      maximizeVolume,
      gasCosts,
      isDutchXOpportunity: false,
      // Params to check user feeCheck Uni
      from,
      sellToken,
      buyToken,
      auctionIndex,
      owlAllowance,
      owlBalance,
      ethUSDPrice
    })

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Step 1 - Get DutchSpendAmount %s',
      params: [
        numberUtil.fromWei(tokenAmount).toString(10)
      ]
    })
    // now we have the amount to use as buyToken on DutchX, but we actually
    // need the amount of Ether to spend on Uniswap. To get this we need
    // to find out how much the tokens cost in Ether on Uniswap.
    let amount = this.getOutputPrice(tokenAmount, inputBalance, outputBalance)

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Step 2 - Get Uniswap expected amount %s',
      params: [
        numberUtil.fromWei(amount).toString(10)
      ]
    })

    // how much Ether would I get when buying after fees applied on DutchX
    let { closesAuction, amountAfterFee } = await this._auctionRepo.getCurrentAuctionPriceWithFees({
      sellToken, buyToken, auctionIndex, amount: tokenAmount, from, owlAllowance, owlBalance, ethUSDPrice })
    const dutchXExpected = amountAfterFee.div(dutchPrice)

    // Is better to use outstandingVolume directly
    // if (closesAuction) {
    //   amount = amountAfterFee
    // }

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Step 3 - Get amount after fee %s)',
      params: [
        numberUtil.fromWei(amountAfterFee).toString(10)
      ]
    })

    const expectedProfit = dutchXExpected.sub(amount)// .sub(gasCosts)

    const expectedProfitInUsd = await this._auctionRepo.getPriceInUSD({
      token: sellToken,
      amount: expectedProfit
    })

    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Check Uniswap opportunity: \n%O',
      params: [
        {
          outstandingVolume: numberUtil.fromWei(outstandingVolume).toString(),
          tokenAmount: numberUtil.fromWei(tokenAmount).toString(10) + ` ${buyToken}`,
          amount: numberUtil.fromWei(amount).toString(10) + ' ETH',
          dutchExpected: numberUtil.fromWei(dutchXExpected).toString(10) + ' ETH',
          // gasCosts: numberUtil.fromWei(gasCosts).toString(10) + ' ETH',
          expectedProfit: numberUtil.fromWei(expectedProfit).toString(10) + ' ETH',
          expectedProfitInUsd: expectedProfitInUsd.toString(10) + ' USD'
        }
      ]
    })
    // if the amount to spend is 0 there is no opportunity
    // otherwise execute the opportunity
    if (amount.gt(0) && expectedProfitInUsd.gt(minimumProfitInUsd)) {
      dutchPrice = amount.mul(dutchPrice).div(dutchXExpected)
      uniswapPrice = tokenAmount.div(amount)
      auctionLogger.debug({
        sellToken,
        buyToken,
        msg: 'Making an Uniswap opportunity transaction: \n%O',
        params: [{
          balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' ETH',
          dutchPrice: dutchPrice.toString(10) + ' WEI / token',
          uniswapPrice: uniswapPrice.toString(10) + ' WEI / token'
        }]
      })

      const tx = await this._arbitrageRepo.uniswapOpportunity({
        arbToken: buyToken,
        amount,
        from,
        arbitrageContractAddress
      })

      const balanceAfter = await this._auctionRepo.getBalance({
        token: etherTokenAddress,
        address: arbitrageContractAddress
      })
      const actualProfit = balanceAfter.sub(maxEtherToSpend)
      auctionLogger.info({
        sellToken,
        buyToken,
        msg: 'Completed an Uniswap opportunity: \n%O',
        params: [{
          balanceBefore: numberUtil.fromWei(maxEtherToSpend).toString(10) + ' ETH',
          balanceAfter: numberUtil.fromWei(balanceAfter).toString(10) + ' ETH',
          actualProfitEth: numberUtil.fromWei(actualProfit).toString(10) + ' ETH',
          actualProfitUSD: numberUtil.fromWei(actualProfit).mul(ethUSDPrice).toString(10) + ' USD'
        }]
      })
      return {
        type: 'Uniswap Opportunity',
        sellToken,
        buyToken,
        amount,
        expectedProfit,
        actualProfit,
        dutchPrice,
        uniswapPrice,
        ethUSDPrice,
        tx
      }
    }
  }

  // def getOutputPrice(outputAmount: uint256, inputReserve: uint256, outputReserve: uint256) -> uint256:
  // assert inputReserve > 0 and outputReserve > 0
  // numerator: uint256 = inputReserve * outputAmount
  // denominator: uint256 = outputReserve - outputAmount
  // return numerator / denominator * 1.003 [(1 + 0.03) add 0.3% Uniswap Fee]
  getOutputPrice (outputAmount, inputReserve, outputReserve) {
    assert(inputReserve.gt(0), 'Input reserve must be greater than 0')
    assert(outputReserve.gt(0), 'Output reserve must be greater than 0')
    const numerator = inputReserve.mul(outputAmount)
    const denominator = outputReserve.sub(outputAmount)
    return numerator.div(denominator).mul(numberUtil.ONE.plus(UNISWAP_FEE))
  }

  // def getInputPrice(inputAmount: uint256, inputReserve: uint256, outputReserve: uint256) -> uint256:
  //   assert inputReserve > 0 and outputReserve > 0
  //   inputAmountWithFee: uint256 = inputAmount * 0.997 [(1 - 0.003) 0.3% Uniswap Fee]
  //   numerator: uint256 = inputAmountWithFee * outputReserve
  //   denominator: uint256 = inputReserve + inputAmountWithFee
  //   return numerator / denominator
  getInputPrice (inputAmount, inputReserve, outputReserve) {
    assert(inputReserve.gt(0), 'Input reserve must be greater than 0')
    assert(outputReserve.gt(0), 'Output reserve must be greater than 0')
    const inputAmountWithFee = inputAmount.mul(numberUtil.ONE.minus(UNISWAP_FEE))
    const numerator = inputAmountWithFee.mul(outputReserve)
    const denominator = inputReserve.add(inputAmountWithFee)
    return numerator.div(denominator)
  }

  async getDutchSpendAmount ({
    maxToSpend,
    inputBalance, // sellToken balance
    outputBalance, // buyToken balance
    dutchPrice,
    maximizeVolume,
    gasCosts,
    isDutchXOpportunity,
    // Params to check user fee
    from,
    sellToken,
    buyToken,
    auctionIndex,
    owlAllowance,
    owlBalance,
    ethUSDPrice
  }) {
    // these must be positive amounts.
    // it is also worth considering making the small increment rather large because
    // it is too precise, the profit margin may disappear between the time it is
    // calculated and actually executed. The DutchX price would improve, but the
    // increased purchase amount might actually create too much slippage on uniswap,
    // potentially destroying the profit
    // const spendIncrementSmall = 1e3
    // const spendIncrementLarge = 1e17
    let spendIncrement = INITIAL_SPEND_INCREMENT
    const spendIncrementMin = MINIMUM_SPEND_INCREMENT

    // let initialize the amount we want to spend (spendAmount) to initial increment
    let dutchSpendAmount = spendIncrement
    let isOpportunity = true
    let isFinalPrice = false

    // We may have more tokens to spend than tokens left to buy on DutchX.
    // We check the tokens left and set them as maxSpendAmount if is lower than the
    // tokens we have to spend
    const outstandingVolume = await this.getOutstandingVolume({
      sellToken, buyToken, auctionIndex
    })

    let maxSpendAmount = maxToSpend.gt(outstandingVolume)
      ? outstandingVolume
      : maxToSpend

    // console.log({dutchSpendAmount: dutchSpendAmount.toString(10)})
    // console.log({maxToSpend: maxToSpend.toString(10)})
    // console.log('dutchSpendAmount is gt maxtospend', dutchSpendAmount.gt(maxToSpend) )
    // want to loop through smaller and smaller spending increments
    // stop when maxToSpend is hit or when the increment price is too small
    while (!isFinalPrice) {
      if (dutchSpendAmount.gt(maxSpendAmount) || !isOpportunity) {
        if (dutchSpendAmount.lte(maxSpendAmount) && spendIncrement.gt(spendIncrementMin)) {
          const reducedSpendIncrement = spendIncrement.div(10)
          dutchSpendAmount = dutchSpendAmount.sub(spendIncrement).add(reducedSpendIncrement)
          spendIncrement = reducedSpendIncrement
          isOpportunity = true
          continue
        } else {
          dutchSpendAmount = dutchSpendAmount.sub(spendIncrement)
          isFinalPrice = true
          isOpportunity = true
          continue
        }
      }

      // console.log({dutchSpendAmount: numberUtil.fromWei(dutchSpendAmount).toString(10)})
      // when you spend some amount, part is removed as liquidity contribution.
      // Your buy is recorded as only the reduced amount.
      let { closesAuction, amountAfterFee } = await this._auctionRepo.getCurrentAuctionPriceWithFees({
        sellToken, buyToken, auctionIndex, amount: dutchSpendAmount, from, owlAllowance, owlBalance, ethUSDPrice })

      // console.log({closesAuction, amountAfterFee: amountAfterFee.toString(10)})

      let amountAfterFeeAndGas = amountAfterFee
      // i'm the buyer i'm buying with buytoken
      // if buyToken is Ether it's a dutchOpportunity
      // the amount being returned will be in Ether
      if (isDutchXOpportunity) {
        amountAfterFeeAndGas = amountAfterFee// .sub(gasCosts)
      }

      // console.log({amountAfterFeeAndGas: numberUtil.fromWei(amountAfterFeeAndGas).toString(10)})
      // if you were to claim your buy right away it would be that amountAfterFee
      // times the current price
      let dutchPriceWithFee
      // if your buy closes the auction there is no fee
      if (closesAuction) {
        // the price is calculated for after you've also paid the gasCosts in Ether
        dutchPriceWithFee = dutchPrice
      } else {
        dutchPriceWithFee = dutchSpendAmount.mul(dutchPrice).div(amountAfterFeeAndGas)
      }
      // console.log({dutchPriceWithFee: dutchPriceWithFee.toString(10)})
      // spendAmount is a buyToken. buyToken is traded for sellToken
      // sellToken is inputToken, outputToken is buyToken
      // uniswapSpendAmount is sellToken, outputAmount is inputToken
      let uniswapSpendAmount = dutchSpendAmount.div(dutchPriceWithFee)

      // spendAmount on Uniswap is amount returned from the DutchX
      // how much does it cost to acquire this much?
      // amountAfterFeeUniswap is buyerToken
      let amountAfterFeeUniswap = this.getInputPrice(
        uniswapSpendAmount, inputBalance, outputBalance)

      // console.log({amountAfterFeeUniswap: numberUtil.fromWei(amountAfterFeeUniswap).toString(10)})
      // if we take the price as amountAfterFeeUniswap / uniswapSpendAmount, it will be the total price for the entire purchase.
      // This purchase may be cheaper than the total price for a purchase on dutchX, but may also result in pushing the final
      // uniswap price above the current dutchX price. This would mean that part of the purchase made was at a loss. This strategy
      // would be good if the goal was to maximize volume. However if the goal is to maximize profit, purchases made on uniswap should
      // only occur up to the point that the current exact price of uniswap is at or below the dutchX price.
      let uniswapPrice
      if (maximizeVolume) {
        uniswapPrice = amountAfterFeeUniswap.div(uniswapSpendAmount)
      } else {
        // maximize profit
        uniswapPrice = (amountAfterFeeUniswap.add(outputBalance)).div(inputBalance.add(uniswapSpendAmount))
      }

      // console.log('dutchPriceWithFee', dutchPriceWithFee.toString())
      // console.log('dutchSpendAmount', dutchSpendAmount.toString())
      // console.log('uniswapSpendAmount', uniswapSpendAmount.toString())
      // console.log('Uniswap Price', uniswapPrice.toString())

      if (dutchPriceWithFee.gt(uniswapPrice)) {
        isOpportunity = false
      } else {
        dutchSpendAmount = dutchSpendAmount.add(spendIncrement)
      }
    }
    // console.log({dutchSpendAmount: numberUtil.fromWei(dutchSpendAmount).toString(10)})
    return dutchSpendAmount
  }

  // ------------------------------------------------------------------------
  // ---------    Arbitrage repository interaction functions     ------------
  // ------------------------------------------------------------------------
  async balanceOf (address) {
    return this._ethereumRepo.balanceOf({ account: address })
  }
  async ethToken () {
    return this._auctionRepo.ethToken()
  }

  async owner (arbitrageAddress) {
    return this._arbitrageRepo.owner(arbitrageAddress)
  }

  async depositToken ({ token, amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.depositToken({
      token, amount, from, arbitrageContractAddress })
  }

  async uniswapOpportunity ({ arbToken, amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.uniswapOpportunity({
      arbToken, amount, from, arbitrageContractAddress })
  }

  async transferOwnership ({ newOwner, arbitrageAddress, from }) {
    return this._arbitrageRepo.transferOwnership({ newOwner, arbitrageAddress, from })
  }

  async withdrawEther ({ amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.withdrawEther({
      amount, from, arbitrageContractAddress })
  }

  async withdrawToken ({ token, amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.withdrawToken({
      token, amount, from, arbitrageContractAddress })
  }
  async claimBuyerFunds ({ token, auctionIndex, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.claimBuyerFunds({
      token, auctionIndex, from, arbitrageContractAddress })
  }

  async withdrawEtherThenTransfer ({ amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.withdrawEtherThenTransfer({
      amount, from, arbitrageContractAddress })
  }

  async transferEther ({ amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.transferEther({
      amount, from, arbitrageContractAddress })
  }

  async transferToken ({ token, amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.transferToken({
      token, amount, from, arbitrageContractAddress })
  }

  async dutchOpportunity ({ arbToken, amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.dutchOpportunity({
      arbToken, amount, from, arbitrageContractAddress })
  }

  async getContractEtherBalance ({ arbitrageContractAddress }) {
    const contractBalance =
      await this._ethereumRepo.balanceOf({ account: arbitrageContractAddress })
    return numberUtil.fromWei(contractBalance)
  }

  async getArbitrageAddress () {
    return this._arbitrageRepo.getArbitrageAddress()
  }

  async getBalance ({ token, arbitrageContractAddress }) {
    const account = arbitrageContractAddress

    const tokenAddress = !token
      ? await this._auctionRepo.ethToken()
      : await this._auctionRepo.getTokenAddress({ token })
    const tokenInfo = await this._ethereumRepo.tokenGetInfo({ tokenAddress })

    let contractBalance
    if (!token) {
      contractBalance = await this._ethereumRepo.balanceOf({ account })
      contractBalance = numberUtil.fromWei(contractBalance)
      contractBalance += ' ETH'
    } else {
      contractBalance = await this._ethereumRepo.tokenBalanceOf({ tokenAddress, account })
      contractBalance = numberUtil.toDecimal(contractBalance, tokenInfo.decimals || 0)
      contractBalance += ' ' + tokenInfo.symbol
    }

    let dutchBalance = await this._auctionRepo.getBalance({ token: tokenAddress, address: account })
    dutchBalance = numberUtil.toDecimal(dutchBalance, tokenInfo.decimals || 0)
    dutchBalance += ' ' + tokenInfo.symbol

    return { contractBalance, dutchBalance }
  }

  async approveToken ({ token, allowance, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.approveToken({ token, allowance, from, arbitrageContractAddress })
  }

  async depositEther ({ amount, from, arbitrageContractAddress }) {
    return this._arbitrageRepo.depositEther({ amount, from, arbitrageContractAddress })
  }

  async getOwner ({ arbitrageContractAddress }) {
    return this._arbitrageRepo.getOwner({ arbitrageContractAddress })
  }

  _getAuctionLockName (operation, sellToken, buyToken, from) {
    const sufix = sellToken < buyToken ? sellToken + '-' + buyToken : buyToken + '-' + sellToken

    return operation + sufix + from
  }

  async getOutstandingVolume ({ sellToken, buyToken, auctionIndex }) {
    return getOutstandingVolume({
      auctionRepo: this._auctionRepo, ethereumRepo: this._ethereumRepo, sellToken, buyToken, auctionIndex
    })
  }

  async getTokenInfo (token) {
    return getTokenInfo({
      auctionRepo: this._auctionRepo, ethereumRepo: this._ethereumRepo, token })
  }

  async getPriceUniswap ({ sellToken, buyToken }) {
    const {
      inputBalance: denominator, // our current sellToken on DutchX
      outputBalance: numerator // our current buyToken on DutchX
    } = await this._arbitrageRepo.getUniswapBalances({ sellToken, buyToken })

    const [
      { decimals: sellTokenDecimals },
      { decimals: buyTokenDecimals }
    ] = await Promise.all([
      this.getTokenInfo(sellToken),
      this.getTokenInfo(buyToken)
    ])

    const priceWithDecimals = formatUtil.formatPriceWithDecimals({
      price: { numerator, denominator }, tokenADecimals: sellTokenDecimals, tokenBDecimals: buyTokenDecimals
    })

    return numberUtil.toBigNumberFraction(priceWithDecimals, true) // buyToken per sellToken
  }
}

module.exports = ArbitrageService
