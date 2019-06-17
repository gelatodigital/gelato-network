const debug = require('debug')('DEBUG-dx-service:helpers:instanceFactory')
debug.log = console.debug.bind(console)

const originalConfig = require('../../conf/')
const messageNotifier = require('./messageNotifier')
/*
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'
*/

const getEventBus = require('../getEventBus')
const loadContracts = require('../loadContracts')
const getEthereumClient = require('../helpers/ethereumClient')

// Repos
const getArbitrageRepo = require('../repositories/ArbitrageRepo')
const getAuctionRepo = require('../repositories/AuctionRepo')
const getDxPriceOracleRepo = require('../repositories/DxPriceOracleRepo')
const getPriceRepo = require('../repositories/PriceRepo')
const getEthereumRepo = require('../repositories/EthereumRepo')
const getSlackRepo = require('../repositories/SlackRepo')

// Services
const getArbitrageService = require('../services/ArbitrageService')
const getAuctionService = require('../services/AuctionService')
const getBotsService = require('../services/BotsService')
const getDxInfoService = require('../services/DxInfoService')
const getDxManagementService = require('../services/DxManagementService')
const getDxTradeService = require('../services/DxTradeService')
const getLiquidityService = require('../services/LiquidityService')
const getMarketService = require('../services/MarketService')
const getReportService = require('../services/ReportService')

async function createInstances ({
  test = false,
  createReportService = true, // TODO: Improve how we pull services
  config: configOverride = {}
} = {}) {
  const config = Object.assign({}, originalConfig, configOverride)

  debug('Initializing app for %s environment...', config.ENVIRONMENT)

  const eventBus = await getEventBus()

  // We init the error handler
  messageNotifier.init({ sentryDsn: config.SENTRY_DSN })

  // Ethereum client
  const ethereumClient = await getEthereumClient()

  // Contracts
  const contracts = await loadContracts()

  // Repos
  const arbitrageRepo = await getArbitrageRepo()
  const auctionRepo = await getAuctionRepo()
  const dxPriceOracle = await getDxPriceOracleRepo()
  const priceRepo = await getPriceRepo()
  const ethereumRepo = await getEthereumRepo()

  // Slack client
  const slackRepo = await getSlackRepo()

  // Services
  const liquidityService = await getLiquidityService()
  const dxInfoService = await getDxInfoService()
  const dxManagementService = await getDxManagementService()
  const dxTradeService = await getDxTradeService()
  const botsService = await getBotsService()
  const marketService = await getMarketService()
  const auctionService = await getAuctionService()
  const arbitrageService = await getArbitrageService()

  let reportService
  if (createReportService) {
    reportService = await getReportService()
  } else {
    reportService = null
  }

  let instances = {
    config: config,
    eventBus,
    contracts,
    ethereumClient,
    slackRepo,

    // services
    liquidityService,
    dxInfoService,
    dxManagementService,
    dxTradeService,
    botsService,
    marketService,
    arbitrageService,
    auctionService,
    reportService
  }

  if (test) {
    // For testing is handy to return also the repos, client, etc
    instances = Object.assign({}, instances, {
      dxPriceOracle,
      priceRepo,
      arbitrageRepo,
      auctionRepo,
      ethereumRepo,
      ethereumClient
    })
  }
  return instances
}

module.exports = createInstances
