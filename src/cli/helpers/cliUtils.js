const PARAM_BY_NAME = {
  'token-pair': {
    type: 'string',
    describe: 'The token pair of the auction, i.e. WETH-RDN'
  },

  'sell-token': {
    type: 'string',
    describe: 'A token symbol or address is being sold, i.e. '
  },

  'buy-token': {
    type: 'string',
    describe: 'The token symbol or address that is being bought, i.e. RDN'
  },

  'token-pairs': {
    type: 'string', // TODO: See how to make this a list :)
    describe: 'The token pair of the auction, i.e. WETH-RDN,WETH-OMG'
  },

  'token': {
    type: 'string',
    describe: 'Name of the token, i.e. WETH'
  },

  'auction-index': {
    type: 'integer',
    default: null,
    describe: 'Index of the auction, i.e. 23'
  },

  'from-auction': {
    type: 'integer',
    default: null,
    describe: 'Index of the auction, i.e. 23'
  },

  'count': {
    type: 'number',
    default: 5,
    describe: 'The number of elements, i.e. 5'
  },

  'amount': {
    type: 'float',
    describe: 'Amount to buy, i.e. 0.8'
  },

  'account': {
    type: 'string',
    describe: 'Address where you send the tokens'
  },

  'period': {
    type: 'string',
    describe: 'Date period, i.e today, yesterday, week, last-week or current-week'
  },

  'from-date': {
    type: 'string',
    describe: 'From date period, i.e 2018-06-23'
  },

  'to-date': {
    type: 'string',
    describe: 'To date period, i.e 2018-06-23'
  }
}

function addPositionalByName (name, yargs) {
  const paramConfig = PARAM_BY_NAME[name]
  if (paramConfig) {
    yargs.positional(name, paramConfig)
  } else {
    throw new Error("There's no positional argument named: " + name)
  }
}

function addOptionByName ({ name, yargs, demandOption }) {
  const paramConfig = PARAM_BY_NAME[name]
  if (paramConfig) {
    const params = Object.assign({}, paramConfig)
    if (demandOption !== undefined) {
      params.demandOption = demandOption
    }
    yargs.option(name, params)
  } else {
    throw new Error("There's no positional argument named: " + name)
  }
}

function tokenize (value) {
  if (!value) {
    return null
  }

  const tokenized = value.split(',')
  if (typeof tokenized === 'string') {
    return [ tokenized ]
  } else {
    return tokenized
  }
}

function toTokenPairs (tokenPairString) {
  const tokenPairsTokenized = tokenize(tokenPairString)

  return tokenPairsTokenized.map(tokenPairString => {
    const [ sellToken, buyToken ] = tokenPairString.split('-')
    return { sellToken, buyToken }
  })
}

module.exports = {
  addPositionalByName,
  addOptionByName,
  tokenize,
  toTokenPairs
}
