const getVersion = require('../../helpers/getVersion')
const getGitInfo = require('../../helpers/getGitInfo')
const ENVIRONMENT = process.env.NODE_ENV
const assert = require('assert')

class BotsService {
  constructor ({
    auctionRepo,
    ethereumRepo,
    markets,
    safes = []
  }) {
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    assert(markets, '"markets" is required')

    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
    this._safes = safes
    this._bots = []

    // About info
    this._gitInfo = getGitInfo()
    this._version = getVersion()
  }

  setBots (bots) {
    this._bots = bots
  }

  registerBot (bot) {
    this._bots.push(bot)
  }

  async getVersion () {
    return this._version
  }

  async getHealthEthereum () {
    return this._ethereumRepo.getHealth()
  }

  async getAbout () {
    const auctionAbout = await this._auctionRepo.getAbout()
    const ethereumAbout = await this._ethereumRepo.getAbout()

    // Return bot info
    const bots = await this._getBotsInfo()

    return {
      version: this._version,
      environment: ENVIRONMENT,
      auctions: auctionAbout,
      markets: this._markets,
      ethereum: ethereumAbout,
      git: this._gitInfo,
      bots
    }
  }

  async getBots () {
    // Return bot info
    return this._getBotsInfo()
  }

  async _getBotsInfo () {
    return Promise.all(
      this._bots.map(async bot => {
        const botInfo = await bot.getInfo()
        return Object.assign({
          name: bot.name,
          type: bot.type,
          startTime: bot.startTime
        }, botInfo)
      })
    )
  }

  async getSafes () {
    return this._safes
  }
}

module.exports = BotsService
