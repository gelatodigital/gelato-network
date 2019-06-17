class EthereumRepoMock {
  async tokenBalanceOf ({ tokenAddress, account }) {
    return 0.3 * 10 ** 18
  }

  async tokenTransfer ({ tokenAddress, account, amount }) {
    return true
  }

  async tokenGetInfo ({ tokenAddress }) {
    const [ symbol, name, decimals ] = await Promise.all([
      this.tokenGetSymbol({ tokenAddress }),
      this.tokenGetName({ tokenAddress }),
      this.tokenGetDecimals({ tokenAddress })
    ])
    return {
      symbol, name, address: tokenAddress, decimals
    }
  }

  async tokenGetSymbol ({ tokenAddress }) {
    switch (tokenAddress) {
      case '0x123':
        return 'WETH'
      case '0x234':
        return 'RDN'
      case '0x345':
        return 'OMG'
    }
  }

  async tokenGetName ({ tokenAddress }) {
    switch (tokenAddress) {
      case '0x123':
        return 'Ethereum Token'
      case '0x234':
        return 'Raiden network tokens'
      case '0x345':
        return 'OmiseGO'
    }
  }

  async tokenGetDecimals ({ tokenAddress }) {
    return 18
  }

  async getFirstBlockAfterDate (date) {}

  async getLastBlockBeforeDate (date) {}
}

module.exports = EthereumRepoMock
