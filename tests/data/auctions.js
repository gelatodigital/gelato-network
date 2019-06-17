const BigNumber = require('bignumber.js')

const pricesInUSD = [{
  token: 'RDN',
  price: 4.115 // $/RDN
}, {
  token: 'WETH',
  price: 1001.962 // $/WETH
}, {
  token: 'OMG',
  price: 13.957 // $/OMG
}]

const pricesInETH = [{
  token: 'RDN',
  price: { numerator: new BigNumber('1000000'), denominator: new BigNumber('4133') }
}, {
  token: 'OMG',
  price: { numerator: new BigNumber('100000'), denominator: new BigNumber('2222') }
}]

const balances = {
  'RDN': {
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': new BigNumber('30.20e18'),
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': new BigNumber('1000.0e18'),
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': new BigNumber('601.112e18')
  },
  'WETH': {
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': new BigNumber('2.23154e18'),
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': new BigNumber('3.88130e18'),
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': new BigNumber('4.01234e18')
  },
  'OMG': {
    '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e': new BigNumber('15.20e18'),
    '0x627306090abaB3A6e1400e9345bC60c78a8BEf57': new BigNumber('500.0e18'),
    '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7': new BigNumber('301.112e18')
  }
}
const now = new Date()
const auctions = {
  'RDN-WETH': [{
    // Aprox 0.004079 ETH/RDN
    index: 75,
    auctionStart: new Date(now.getTime() - 12 * 3600000),
    price: { numerator: new BigNumber('4133'), denominator: new BigNumber('1000000') },
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: new BigNumber('76.5478441e18'),      // RDN. aprox $315
    sellVolumeNext: new BigNumber('12.5478441e18'),  // RDN
    buyVolume: new BigNumber('0e18')                 // WETH
  }, {
    // Aprox 0.004079 ETH/RDN
    index: 76,
    auctionStart: new Date(now.getTime() - 6 * 3600000),
    price: { numerator: new BigNumber('4275'), denominator: new BigNumber('1000000') },
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: new BigNumber('76.5478441e18'),      // RDN. aprox $315
    sellVolumeNext: new BigNumber('12.5478441e18'),  // RDN
    buyVolume: new BigNumber('0e18')                 // WETH
  }, {
    // Aprox 0.004079 ETH/RDN
    index: 77,
    auctionStart: now,
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: new BigNumber('76.5478441e18'),      // RDN. aprox $315
    sellVolumeNext: new BigNumber('12.5478441e18'),  // RDN
    buyVolume: new BigNumber('0e18')                 // WETH
  }],
  'WETH-RDN': [{
    // Aprox 0.004079 ETH/RDN
    index: 75,
    auctionStart: new Date(now.getTime() - 12 * 3600000),
    price: { numerator: new BigNumber('1000000'), denominator: new BigNumber('4133') },
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: new BigNumber('76.5478441e18'),      // RDN. aprox $315
    sellVolumeNext: new BigNumber('12.5478441e18'),  // RDN
    buyVolume: new BigNumber('0e18')                 // WETH
  }, {
    // Aprox 0.004079 ETH/RDN
    index: 76,
    auctionStart: new Date(now.getTime() - 6 * 3600000),
    price: { numerator: new BigNumber('1000000'), denominator: new BigNumber('4275') },
    // https://walletinvestor.com/converter/usd/raiden-network-token/315
    sellVolume: new BigNumber('76.5478441e18'),      // RDN. aprox $315
    sellVolumeNext: new BigNumber('12.5478441e18'),  // RDN
    buyVolume: new BigNumber('17905.9284e18')                 // WETH
  }, {
    index: 77,
    auctionStart: now,
    // https://walletinvestor.com/converter/usd/ethereum/290
    sellVolume: new BigNumber('0.289432035e18'),       // WETH. aprox $290
    sellVolumeNext: new BigNumber('12.5478441e18'),  // WETH
    buyVolume: new BigNumber('0e18')                 // RDN
  }],
  'OMG-WETH': [{
    // Aprox 0.022220 ETH/OMG
    index: 0,
    auctionStart: new Date(now.getTime() - 36 * 3600000),
    price: { numerator: new BigNumber('2222'), denominator: new BigNumber('100000') },
    // https://walletinvestor.com/converter/usd/omisego/315
    sellVolume: new BigNumber('22.1357e18'),        // OMG. aprox $315
    sellVolumeNext: new BigNumber('12.547844e18'),  // OMG
    buyVolume: new BigNumber('0.491855254e18')      // WETH
  }, {
    // Aprox 0.022220 ETH/OMG
    index: 1,
    auctionStart: new Date(now.getTime() - 24 * 3600000),
    price: { numerator: new BigNumber('2222'), denominator: new BigNumber('100000') },
    // https://walletinvestor.com/converter/usd/omisego/315
    sellVolume: new BigNumber('22.1357e18'),        // OMG. aprox $315
    sellVolumeNext: new BigNumber('12.547844e18'),  // OMG
    buyVolume: new BigNumber('0.491855254e18')      // WETH
  }, {
    // Aprox 0.022220 ETH/OMG
    index: 2,
    auctionStart: new Date(now.getTime() - 12 * 3600000),
    price: { numerator: new BigNumber('2312'), denominator: new BigNumber('100000') },
    // https://walletinvestor.com/converter/usd/omisego/315
    sellVolume: new BigNumber('52.5478e18'),        // OMG. aprox $315
    sellVolumeNext: new BigNumber('12.547844e18'),  // OMG
    buyVolume: new BigNumber('1.214905136e18')      // WETH
  }, {
    // Aprox 0.022220 ETH/OMG
    index: 3,
    auctionStart: null,
    // https://walletinvestor.com/converter/usd/omisego/315
    sellVolume: new BigNumber('22.569633e18'),      // OMG. aprox $315
    sellVolumeNext: new BigNumber('12.547844e18'),  // OMG
    buyVolume: new BigNumber('0e18')                // WETH
  }],
  'WETH-OMG': [{
    index: 0,
    auctionStart: new Date(now.getTime() - 36 * 3600000),
    price: { numerator: new BigNumber('100000'), denominator: new BigNumber('2222') },
    // https://walletinvestor.com/converter/usd/ethereum/550
    sellVolume: new BigNumber('1.55999954e18'),           // WETH. aprox $1384
    sellVolumeNext: new BigNumber('10.547844e18'),  // WETH
    buyVolume: new BigNumber('70.207020702070e18')  // OMG
  }, {
    index: 1,
    auctionStart: new Date(now.getTime() - 24 * 3600000),
    price: { numerator: new BigNumber('100000'), denominator: new BigNumber('2222') },
    // https://walletinvestor.com/converter/usd/ethereum/550
    sellVolume: new BigNumber('1.55999954e18'),           // WETH. aprox $1384
    sellVolumeNext: new BigNumber('10.547844e18'),  // WETH
    buyVolume: new BigNumber('70.207020702070e18')  // OMG
  }, {
    index: 2,
    auctionStart: new Date(now.getTime() - 12 * 3600000),
    price: { numerator: new BigNumber('100000'), denominator: new BigNumber('2312') },
    // https://walletinvestor.com/converter/usd/ethereum/550
    sellVolume: new BigNumber('2.287724e18'),       // WETH. aprox $1384
    sellVolumeNext: new BigNumber('10.547844e18'),  // WETH
    buyVolume: new BigNumber('98.9518')                // OMG
  }, {
    index: 3,
    auctionStart: null,
    // https://walletinvestor.com/converter/usd/ethereum/550
    sellVolume: new BigNumber('1.381729e18'),       // WETH. aprox $1384
    sellVolumeNext: new BigNumber('10.547844e18'),  // WETH
    buyVolume: new BigNumber('0e18')                // OMG
  }]
}

module.exports = {
  pricesInUSD,
  pricesInETH,
  balances,
  auctions
}
