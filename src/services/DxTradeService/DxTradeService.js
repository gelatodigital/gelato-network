const loggerNamespace = 'dx-service:services:DxTradeService'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')
const getClaimableTokens = require('../helpers/getClaimableTokens')
const getTokenInfo = require('../helpers/getTokenInfo')

const numberUtil = require('../../../src/helpers/numberUtil')

class DxTradeService {
  constructor ({ auctionRepo, ethereumRepo, markets }) {
    assert(auctionRepo, '"assert" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    // assert(markets, '"markets" is required')
    assert(markets, '"markets" is required')

    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
  }

  async buy ({ sellToken, buyToken, auctionIndex, from, amount }) {
    return this._auctionRepo.postBuyOrder({
      sellToken,
      buyToken,
      auctionIndex,
      from,
      amount
    })
  }

  async sell ({ sellToken, buyToken, auctionIndex, from, amount }) {
    return this._auctionRepo.postSellOrder({
      sellToken,
      buyToken,
      auctionIndex,
      from,
      amount
    })
  }

  async claimAll ({
    tokenPairs,
    address,
    fromAddress: fromAddressAux,
    lastNAuctions
  }) {
    const fromAddress = fromAddressAux || address

    // We get the claimable tokens for all pairs
    const claimableTokensPromises = tokenPairs.map(
      async ({ sellToken: tokenA, buyToken: tokenB }) => {
        const claimableTokens = await getClaimableTokens({
          auctionRepo: this._auctionRepo,
          tokenA,
          tokenB,
          address,
          lastNAuctions
        })

        return Object.assign({ tokenA, tokenB }, claimableTokens)
      }
    )

    const claimableTokens = await Promise.all(claimableTokensPromises)

    const { auctionsAsSeller, auctionsAsBuyer } = claimableTokens.reduce(
      (acc, { tokenA, tokenB, sellerClaims, buyerClaims }) => {
        const { auctionsAsSeller, auctionsAsBuyer } = acc
        function _getIndicesList (claims) {
          return claims.reduce((indices, { auctionIndex }) => {
            indices.push(auctionIndex)
            return indices
          }, [])
        }

        const sellerClaimsIndices = _getIndicesList(sellerClaims)
        if (sellerClaimsIndices.length > 0) {
          auctionsAsSeller.push({
            sellToken: tokenA,
            buyToken: tokenB,
            indices: sellerClaimsIndices
          })
        }

        const buyerClaimsIndices = _getIndicesList(buyerClaims)
        if (buyerClaimsIndices.length > 0) {
          auctionsAsBuyer.push({
            sellToken: tokenA,
            buyToken: tokenB,
            indices: buyerClaimsIndices
          })
        }

        return {
          auctionsAsSeller,
          auctionsAsBuyer
        }
      },
      {
        auctionsAsSeller: [],
        auctionsAsBuyer: []
      }
    )

    let claimSellerResult
    if (auctionsAsSeller.length > 0) {
      logger.info(
        'I have to claim from %d auctions as seller',
        auctionsAsSeller.length
      )
      auctionsAsSeller.forEach(({ sellToken, buyToken, indices }) => {
        logger.info(
          'Claiming as seller %s-%s for auctions: %s',
          sellToken,
          buyToken,
          indices
        )
      })
      claimSellerResult = await this._auctionRepo.claimTokensFromSeveralAuctionsAsSeller(
        {
          auctionsAsSeller,
          fromAddress,
          address
        }
      )
    }

    let claimBuyerResult
    if (auctionsAsBuyer.length > 0) {
      logger.info(
        'I have to claim from %d auctions as buyer',
        auctionsAsBuyer.length
      )
      auctionsAsBuyer.forEach(({ sellToken, buyToken, indices }) => {
        logger.info(
          'Claiming as buyer %s-%s for auctions: %s',
          sellToken,
          buyToken,
          indices
        )
      })
      claimBuyerResult = await this._auctionRepo.claimTokensFromSeveralAuctionsAsBuyer(
        {
          auctionsAsBuyer,
          fromAddress,
          address
        }
      )
    }

    const claimAmounts = claimableTokens.map(({ tokenA, tokenB, sellerClaims, buyerClaims }) => {
      const sumAmounts = claims => {
        return claims.reduce((acc, { amount }) => {
          return acc.add(amount)
        }, numberUtil.ZERO)
      }
      if (sellerClaims.length || buyerClaims.length) {
        const totalSellerClaims = numberUtil.fromWei(sumAmounts(sellerClaims))
        const totalBuyerClaims = numberUtil.fromWei(sumAmounts(buyerClaims))
        logger.info('Claimed %s tokens as seller for %s-%s', totalSellerClaims, tokenA, tokenB)
        logger.info('Claimed %s tokens as buyer for %s-%s', totalBuyerClaims, tokenA, tokenB)

        return {
          tokenA,
          tokenB,
          totalSellerClaims,
          totalBuyerClaims
        }
      }
    })

    return {
      claimAmounts,
      claimSellerTransactionResult: claimSellerResult,
      claimBuyerTransactionResult: claimBuyerResult
    }
  }

  async claimSellerFunds ({ tokenA, tokenB, address, auctionIndex }) {
    logger.info(
      'Claiming seller funds for address %s in auction %d of %s-%s',
      address,
      auctionIndex,
      tokenA,
      tokenB
    )
    return this._auctionRepo.claimSellerFunds({
      sellToken: tokenA,
      buyToken: tokenB,
      from: address,
      auctionIndex
    })
  }

  async claimBuyerFunds ({ tokenA, tokenB, address, auctionIndex }) {
    logger.info(
      'Claiming buyer funds for address %s in auction %d of %s-%s',
      address,
      auctionIndex,
      tokenA,
      tokenB
    )
    return this._auctionRepo.claimBuyerFunds({
      sellToken: tokenA,
      buyToken: tokenB,
      from: address,
      auctionIndex
    })
  }

  async sendTokens ({ token, amount, fromAddress, toAddress }) {
    const { decimals: tokenDecimals } = await getTokenInfo({
      auctionRepo: this._auctionRepo,
      ethereumRepo: this._ethereumRepo,
      token
    })

    if (token === 'ETH') {
      // In case of the ETH, we make sure we have enough EtherTokens
      await this._depositEtherIfRequired({
        amount,
        accountAddress: fromAddress
      })
    }

    const transactionResult = await this._auctionRepo.transferERC20Token({
      from: fromAddress,
      to: toAddress,
      token,
      amount
    })

    logger.info({
      msg: 'Transfered %d %s from %s to %s. Transaction: %s',
      params: [
        numberUtil.fromWei(amount, tokenDecimals),
        token,
        fromAddress,
        toAddress,
        transactionResult.tx
      ]
    })

    return transactionResult
  }

  async setAllowance ({ token, amount, accountAddress }) {
    return this._auctionRepo.setAllowance({
      from: accountAddress,
      token,
      amount
    })
  }

  async getAllowance ({ token, accountAddress }) {
    return this._auctionRepo.getAllowance({
      accountAddress,
      token
    })
  }

  async deposit ({ token, amount, accountAddress }) {
    const amountInEth = numberUtil.toBigNumber(amount).div(1e18)
    // Get the account we want to fund
    // const accountAddress = await this._getAccountAddress(accountIndex)
    logger.info({
      msg: 'Fund the account %s with %d %s',
      params: [accountAddress, amountInEth, token]
    })

    let transactionResult
    if (token === 'WETH') {
      // In case of the WETH, we make sure we have enough EtherTokens
      await this._depositEtherIfRequired({ amount, accountAddress })
    }

    // Check the allowance
    const allowance = await this._auctionRepo.getAllowance({
      accountAddress,
      token
    })
    if (!allowance.greaterThanOrEqualTo(amount)) {
      // We don't have enough allowance
      transactionResult = await this._auctionRepo.setAllowance({
        from: accountAddress,
        token,
        amount
      })
      logger.info({
        msg:
          'Approved the DX to use %d %s on behalf of the user. Transaction: %s',
        params: [amountInEth, token, transactionResult.tx]
      })
    } else {
      // We have anough allowance
      logger.info({
        msg:
          'Not need to do any approval. The DX already have an allowance of %d',
        params: [allowance.div(1e18)]
      })
    }

    // Deposit the tokens into the user account balance
    transactionResult = await this._auctionRepo.deposit({
      from: accountAddress,
      token,
      amount
    })
    logger.info({
      msg:
        'Deposited %d %s into DX account balances for the user. Transaction: %s',
      params: [amountInEth, token, transactionResult.tx]
    })

    return transactionResult
  }

  async _depositEtherIfRequired ({ accountAddress, amount }) {
    let transactionResult

    // Check if the user has already enogh EtherTokens
    const etherTokenBalance = await this._auctionRepo.getBalanceERC20Token({
      token: 'WETH',
      address: accountAddress
    })
    const amountInWei = numberUtil.toBigNumber(amount)

    if (etherTokenBalance.lessThan(amount)) {
      const missingDifference = amountInWei.minus(etherTokenBalance)

      logger.info({
        msg: `We don't have enougth WETH, so we need to wrap %d ETH into the WETH token`,
        params: [missingDifference.div(1e18)]
      })

      transactionResult = await this._auctionRepo.depositEther({
        from: accountAddress,
        amount: missingDifference
      })
      logger.info({
        msg: 'Wrapped %d ETH in WETH token. Transaction: %s',
        params: [amountInWei.div(1e18), transactionResult.tx]
      })
    }
  }

  async withdraw ({ token, amount, accountAddress }) {
    const amountInEth = numberUtil.toBigNumber(amount).div(1e18)
    // Get the account we want to fund
    // const accountAddress = await this._getAccountAddress(accountIndex)
    logger.info({
      msg: 'Withdraw the account %s with %d %s',
      params: [accountAddress, amountInEth, token]
    })

    let transactionResult

    // Withdraw the tokens into the user account balance
    transactionResult = await this._auctionRepo.withdraw({
      from: accountAddress,
      token,
      amount
    })
    logger.info({
      msg:
        'Withdrawed %d %s into DX account balances for the user. Transaction: %s',
      params: [amountInEth, token, transactionResult.tx]
    })

    return transactionResult
  }

  async withdrawEther ({ accountAddress, amount }) {
    const amountInEth = numberUtil.toBigNumber(amount).div(1e18)

    logger.info({
      msg: 'Unwrap %d to the account %s',
      params: [amount, accountAddress]
    })

    let transactionResult

    // Withdraw the tokens into the user account balance
    transactionResult = await this._auctionRepo.withdrawEther({
      from: accountAddress,
      amount
    })
    logger.info({
      msg: 'Unwraped %d WETH into %s account. Transaction: %s',
      params: [amountInEth, accountAddress, transactionResult.tx]
    })

    return transactionResult
  }

  async _getAccountAddress (accountIndex) {
    const accounts = await this._ethereumRepo.getAccounts(accountIndex)

    assert(
      accounts.length >= accountIndex - 1,
      `There should be at least \
${accountIndex} accounts, but there's just ${accounts}`
    )

    return accounts[accountIndex - 1]
  }

  // TODO: Bring and refactor the `testSetup` logic that the bot-cli uses
}

module.exports = DxTradeService
