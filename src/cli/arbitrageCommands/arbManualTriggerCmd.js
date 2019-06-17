const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'manual-trigger <token> [--arbitrage-contract address] [--minimum-usd-profit profit]',
    'Manually launch an arbitrage check',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
      yargs.option('minimum-usd-profit', {
        type: 'string',
        describe: 'The minimum USD expected profit to trigger arbitrage'
      })
    }, async function (argv) {
      const { token, arbitrageContract, minimumUsdProfit } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        confArbitrageContractAddress,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageContractAddress(),
        getArbitrageService()
      ])

      const ethToken = await arbitrageService.ethToken()

      let arbitrageContractAddress = arbitrageContract
      if (!arbitrageContract) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      try {
        const arbitrageResult = await arbitrageService.checkUniswapArbitrage({
          sellToken: token,
          buyToken: ethToken,
          from,
          arbitrageContractAddress,
          minimumProfitInUsd: minimumUsdProfit
        })
        let executions = arbitrageResult.length
        logger.info(`${executions} arbitrage trans0xd54b47f8e6a1b97f3a84f63c867286272b273b7caction(s) \
${executions !== 1 ? 'were' : 'was'} successfully executed. %O`, arbitrageResult)

        // vv Uncomment to see logs
        // if (executions > 0) {
        //   arbitrageResult.map(r => {
        //     r.tx.receipt.logs.map(l => {
        //       console.log('l:', l)
        //     })
        //     r.tx.logs.map(l => {
        //       console.log(l)
        //       // console.log(l.args)
        //       if (l.args.profit) {
        //         console.log('Profit', l.args.profit.toString(10))
        //       }
        //     })
        //   })
        // }

      } catch (error) {
        logger.error('The arbitrage was NOT succesful.', error)
      }
    })
}

module.exports = registerCommand
