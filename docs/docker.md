# Docker
## CLI - Command Line Interface
Use the CLI:
```bash
docker run \
  -e NODE_ENV=pre \
  -e ETHEREUM_RPC_URL=https://rinkeby.infura.io \
  -e NETWORK=rinkeby \
  -e MARKETS=WETH-RDN,WETH-OMG \
  -e RDN_TOKEN_ADDRESS=0x3615757011112560521536258c1e7325ae3b48ae \
  -e OMG_TOKEN_ADDRESS=0x00df91984582e6e96288307e9c2f20b38c8fece9 \
  gnosispm/dx-services:staging \
  yarn cli -- \
    state WETH-RDN
```

In the previous command, notice that:
* `NODE_ENV`: Stablish the environment. Valid values are `dev`, `pre`, `pro`.
* `ETHEREUM_RPC_URL`: Ethereum node. i.e. http://localhost:8545 or https://rinkeby.infura.io
* `MARKETS`: List of token pairs in the format: `<token1>-<token2>[,<tokenN>-<tokenM>]*`,
  i.e. `WETH-RDN,WETH-OMG`
    * For every token, you must also provide its address using an environment
      variable with the name: `<token>__TOKEN_ADDRESS`. i.e. `RDN_TOKEN_ADDRESS`.
    * **WETH, MGN and OWL Tokens** are part of the DutchX mechanism, so you don't
      have (and shouldn't) have to provide an address for them.
* `gnosispm/dx-services:staging`: Is the name of the Docker image. `staging` is
  the image generated out of the master branch. You can checkout other images
  in [https://hub.docker.com/r/gnosispm/dx-services]()
* `yarn cli`: Is the npm script that will run the CLI
* `state WETH-RDN`:
  * Is the command executed by the CLI.
  * There's a lot of commands
  * You can run many other commands, just run `-h` to get the complete list.
  * For more information about the CLI, check out the
    [dx-examples-liquidity-bots](https://github.com/gnosis/dx-examples-liquidity-bots) project.


## Public API
Start API:
```bash
docker run \
  -e NODE_ENV=pre \
  -e ETHEREUM_RPC_URL=https://rinkeby.infura.io \
  -e MARKETS=WETH-RDN,WETH-OMG \
  -e RDN_TOKEN_ADDRESS=0x3615757011112560521536258c1e7325ae3b48ae \
  -e OMG_TOKEN_ADDRESS=0x00df91984582e6e96288307e9c2f20b38c8fece9 \
  -p 8080:8080 \
  gnosispm/dx-services:staging \
  yarn api
```

To check out the Public API, just open [http://localhost:8080]() in any Browser.

In the previous command, notice that it has a similar configuration as in the CLI
run, with the difference of:
* `-p 8080:8080`: It tells Docker to expose the container port 8080 (the API one)
  in the host machine.
* `yarn api`: NPM script used to run the Public API.

> For more information about the Public API, chec kout:
>   * [API Documentation](https://dx-services.dev.gnosisdev.com/)
>   * [Example of API usage](https://github.com/gnosis/dx-examples-api)


## Liquidity Bots
Start bots:
First of all you need to configure the bots using a file with this structure:
```javascript
const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' }
]
const BUY_LIQUIDITY_RULES_DEFAULT = [
  // Buy 1/2 if price falls below 99%

  {
    marketPriceRatio: {
      numerator: 99,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 2
    }
  },

  // Buy the 100% if price falls below 96%
  {
    marketPriceRatio: {
      numerator: 96,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }
]

const MAIN_BOT_ACCOUNT = 0

const BUY_LIQUIDITY_BOTS = [{
  name: 'Main buyer bot',
  markets: MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  rules: BUY_LIQUIDITY_RULES_DEFAULT,
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }]
}]

const SELL_LIQUIDITY_BOTS = [{
  name: 'Main seller bot',
  markets: MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }]
}]

module.exports = {
  MARKETS,
  MAIN_BOT_ACCOUNT,
  BUY_LIQUIDITY_BOTS,
  SELL_LIQUIDITY_BOTS
}
```

```bash
docker run \
  -e MNEMONIC="super secret thing that nobody should know ..." \
  -e NODE_ENV=pre \
  -e NETWORK=rinkeby \
  -e ETHEREUM_RPC_URL=https://rinkeby.infura.io \
  -e RDN_TOKEN_ADDRESS=0x3615757011112560521536258c1e7325ae3b48ae \
  -e OMG_TOKEN_ADDRESS=0x00df91984582e6e96288307e9c2f20b38c8fece9 \
  --mount type=bind,source=route/for/custom/config,destination=/usr/src/app/custom_conf
  -e CONFIG_FILE=/usr/src/app/custom_conf/config_file.js
  -p 8081:8081 \
  gnosispm/dx-services:staging \
  yarn bots
```
To check out the Bots API, just open [http://localhost:8081]() in any Browser.

In the previous command, notice that it has a similar configuration as in the
Public API run, with the difference of:
* `MNEMONIC`: Allows to setup the bots account used to sign the transactions.
* `MARKETS`: It's not used in this case
* `CONFIG_FILE`: The file with details about bot configuration
* `--mount`: Mount a volume in the docker container that should contain the CONFIG_FILE. The `source` route should be the route containing the desired config file. The route passed to `CONFIG_FILE` should be relative to `destination` folder in the container
* `-p 8081:8081`: The Bots API it's exposed on port 8081.
* `yarn bots`: NPM Script used to run the Liquidity Bots.

> For more information about the Bots, check out the [dx-examples-liquidity-bots](https://github.com/gnosis/dx-examples-liquidity-bots) project.
