const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')

const getAddress = require('../../helpers/getAddress')
const getDxInfoService = require('../../services/DxInfoService')
const loadContracts = require('../../loadContracts')

function registerCommand ({ cli, logger }) {
  cli.command(
    'balances',
    'Get the balances for all known tokens for a given account. If no account selected mnemonic account is used (i.e. )',
    yargs => {
      cliUtils.addOptionByName({ name: 'account', yargs })
      yargs.option('verbose', {
        type: 'boolean',
        alias: 'v',
        describe: 'Extra info about tokens is showed'
      })
    }, async function (argv) {
      let { account, verbose } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        accountFromConfig,
        dxInfoService,
        contracts
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxInfoService(),
        loadContracts()
      ])

      if (!account) {
        account = accountFromConfig
      }

      const tokenOwl = {
        symbol: 'OWL',
        tokenAddress: contracts.owl.address
      }

      logger.info(`\n**********  Balance for ${account}  **********\n`)
      const [balanceETH, lockedFrt, currentLiqContributionLevel, owlBalances] = await Promise.all([
        dxInfoService.getBalanceOfEther({ account }),
        contracts.mgn.lockedTokenBalances(account),
        dxInfoService.getCurrentFeeRatio({ address: account }),
        _getBalance({
          account,
          token: tokenOwl,
          dxInfoService,
          dxAddress: contracts.dx.address
        })
      ])

      logger.info('\tACCOUNT: %s', account)
      logger.info('\tBALANCE: %d ETH', formatUtil.formatFromWei(balanceETH))
      logger.info('\tOWL BALANCE: %d OWL', formatUtil.formatFromWei(owlBalances.amount))
      logger.info('\tLocked FRT: %d MGN', formatUtil.formatFromWei(lockedFrt))
      logger.info('\tLiquidity Contribution Level: %d % ', currentLiqContributionLevel.mul(100))

      const [configuredMarketsTokenList, magnoliaToken] = await Promise.all([
        dxInfoService.getConfiguredTokenList(),
        dxInfoService.getMagnoliaToken()
      ])
      let tokens = configuredMarketsTokenList.data.map(({ symbol, address }) => {
        return {
          symbol,
          tokenAddress: address
        }
      })

      tokens = Object.keys(contracts.erc20TokenContracts).reduce((tokensAcc, symbol) => {
        const alreadyAddedToken = token => {
          return token.symbol === symbol
        }
        if (!tokensAcc.some(alreadyAddedToken)) {
          tokensAcc.push({
            symbol,
            tokenAddress: contracts.erc20TokenContracts[symbol].address
          })
        }
        return tokensAcc
      }, tokens)

      tokens.push({
        symbol: magnoliaToken.symbol,
        tokenAddress: magnoliaToken.address
      })

      // Add WETH to the ERC20 list to see balance as is an special token
      // tokens.push({
      //   symbol: 'WETH',
      //   tokenAddress: await dxInfoService.getTokenAddress('WETH')
      // })

      const balancePromises = tokens.map(token => _getBalance({
        account,
        token,
        dxInfoService,
        dxAddress: contracts.dx.address
      }))

      const balances = await Promise.all(balancePromises)
      balances.forEach(balance => {
        logger.info('\n\tBalances %s (%s):', balance.token, balance.tokenAddress)
        logger.info(
          '\t\t- Balance in DX: %s%s',
          formatUtil.formatFromWei(balance.amountInDx, balance.decimals),
          (balance.amountInDx.greaterThan(0) && balance.priceUsdInDx) ? ` (${balance.priceUsdInDx} USD)` : ''
        )
        logger.info(
          '\t\t- Balance of user: %s%s',
          formatUtil.formatFromWei(balance.amount, balance.decimals),
          (balance.amount.greaterThan(0) && balance.priceUsd) ? ` (${balance.priceUsd} USD)` : ''
        )

        if (verbose) {
          logger.info('\t\t- Approved for DX: ' + formatUtil.formatFromWei(balance.allowance, balance.decimals))
          logger.info('\t\t- Token Supply: ' + formatUtil.formatFromWei(balance.totalSupply, balance.decimals))
          // console.log('\t\t- Token address: ' + balance.tokenAddress)
        }
      })
      logger.info('\n**************************************\n\n')
    })
}

async function _getBalance ({
  token,
  dxInfoService,
  account,
  dxAddress
}) {
  const { tokenAddress, symbol } = token

  const {
    amount,
    allowance,
    totalSupply,
    amountInDx
  } = await _getBasicBalances({
    tokenAddress,
    symbol,
    account,
    dxInfoService,
    dxAddress
  })

  const { priceUsdInDx, priceUsd } = await _getUsdEstimation({
    amount,
    amountInDx,
    dxInfoService
  })

  const { decimals } = await dxInfoService.getTokenInfo(tokenAddress)

  return {
    tokenAddress,
    token: symbol,
    amount,
    allowance,
    totalSupply,
    amountInDx,
    priceUsdInDx,
    priceUsd,
    decimals
  }
}

async function _getBasicBalances ({
  tokenAddress,
  symbol,
  account,
  dxInfoService,
  dxAddress
}) {
  // TODO: Create a service function that return the balance details so we don't
  // have to do so many service calls
  const [
    amount,
    allowance,
    totalSupply,
    amountInDx
  ] = await Promise.all([
    // get token balance
    dxInfoService.getAccountBalanceForTokenNotDeposited({ token: tokenAddress, account }),
    dxInfoService.getTokenAllowance({
      tokenAddress,
      owner: account,
      spender: dxAddress
    }),
    dxInfoService.getTokenTotalSupply({ tokenAddress }),
    // get token balance in DX
    dxInfoService.getAccountBalanceForToken({ token: symbol, address: account })
  ])

  return {
    amount,
    allowance,
    totalSupply,
    amountInDx
  }
}

async function _getUsdEstimation ({
  symbol,
  amountInDx,
  amount,
  dxInfoService
}) {
  const priceUsdInDxPromise = dxInfoService
    .getPriceInUSD({
      token: symbol, amount: amountInDx
    })
    .then(price => price.toFixed(2))
    .catch(() => null)

  const priceUsdPromise = dxInfoService
    .getPriceInUSD({ token: symbol, amount })
    .then(price => price.toFixed(2))
    .catch(() => null)

  const [priceUsdInDx, priceUsd] = await Promise.all([
    priceUsdInDxPromise,
    priceUsdPromise
  ])

  return {
    priceUsdInDx,
    priceUsd
  }
}

module.exports = registerCommand
