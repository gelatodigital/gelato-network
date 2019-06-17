[![Build Status](https://travis-ci.org/gnosis/dx-services.svg?branch=master)](https://travis-ci.org/gnosis/dx-services?branch=master)
[![npm version](https://badge.fury.io/js/dx-services.svg)](https://badge.fury.io/js/dx-services)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/dx-services/badge.svg?branch=master)](https://coveralls.io/github/gnosis/dx-services?branch=master)

<p align="center">
  <img width="350px" src="http://dutchx.readthedocs.io/en/latest/_static/DutchX-logo_blue.svg" />
</p>

# DutchX Services
DutchX Services is a project that contains services and other goodies to
facilitate the interaction with the DutchX smart contracts.

# Documentation
Check out the [DutchX Documentation](http://dutchx.readthedocs.io/en/latest).

# Develop
## Run a local node and setup
Setup a working environment:
```bash
# Install dependencies
yarn install

# In one tab, run a local Ganache
yarn rpc

# Run the setup script, which will:
#   - migrate all contracts into your local node
#   - create some test data, basically:
#       - I'll fund the the second account of generated with the mnemonic, so
#         it has some funds for trading
#       - It'll add a RDN-WETH token pair into the DX
#       - It'll make sure RDN-WETH is running. It'll automatically advance time,
#         or participate in the auctions if it's required
yarn setup
```

You can make sure the auction is running:
```bash
yarn cli state RDN-WETH
```

You should see something like:
```
 INFO-cli
  INFO-cli **********  State of RDN-WETH  **********
  INFO-cli  +0ms
  INFO-cli  Token pair: RDN-WETH
  INFO-cli  +0ms
  INFO-cli  Has the token pair been added? Yes +0ms
  INFO-cli  State: RUNNING
  INFO-cli  +0ms
  INFO-cli  Are tokens Approved? +0ms
  INFO-cli    - RDN: Yes +0ms
  INFO-cli    - WETH: Yes
  INFO-cli  +1ms
  INFO-cli  State info: +0ms
  INFO-cli    - auctionIndex: 1 +0ms
  INFO-cli    - auctionStart: 29/08/18 20:03 +1ms
  INFO-cli    - It started: a few seconds ago +1ms
  INFO-cli    - It will reach the last auction closing price in: 6 hours +0ms
  INFO-cli  +0ms
  INFO-cli  Auction RDN-WETH: +0ms
  INFO-cli    Is closed: Yes (closed from start) +0ms
  INFO-cli    Sell volume: 0 +0ms
  INFO-cli  +0ms
  INFO-cli  Auction WETH-RDN: +0ms
  INFO-cli    Is closed: No +1ms
  INFO-cli    Sell volume: +0ms
  INFO-cli      sellVolume: 13.057385 WETH +0ms
  INFO-cli      sellVolume: 14363.1235 USD +0ms
  INFO-cli    Price: +0ms
  INFO-cli      Current Price: 489.0246361597564471047 RDN/WETH +0ms
  INFO-cli      Closing Price: 245.15812699190978180926 RDN/WETH +0ms
  INFO-cli      Price relation: 199.47% +0ms
  INFO-cli    Buy volume: +0ms
  INFO-cli      buyVolume: 0 RDN +1ms
  INFO-cli      Bought percentage: 0.0000 % +0ms
  INFO-cli      Outstanding volume: 6385.382948822861 RDN +0ms
  INFO-cli
  INFO-cli **************************************
```

One interesting thing you can do is advance time:
```bash
# Advance 5.5 hours forward
yarn cli2 --time 5.5

# DEBUG-dx-service:tests:helpers:testSetup Time before increase time:  Wed, 29 Aug 2018 18:03:38 GMT +0ms
# DEBUG-dx-service:tests:helpers:testSetup Time after increase 5.5 hours:  Wed, 29 Aug 2018 18:03:38 GMT +23ms
```

If you check the state of the auction now, you'll see how the price dropped.
Also you'll see that we are 30min away from the last closing price.

There's a lot of operations you can do with the `CLI`, for some examples you
can check
[dx-tools](https://github.com/gnosis/dx-tools#basic-usage) project
. For a complete list, just type:

```bash
# Get help from the CLI
yarn cli --help

# Or, get help from a specific command from it
yarn cli buy --help
```

So for example, we can check our balance of the tokens, and our balance within
the DutchX:
```bash
# Balance for our default account
#  - 2nd one generated from the mnemonic in local (we use the 1st one for the
#    auctioneer of the DutchX contracts)
#  - 1st ine generated from the mnemonic in any other environment
yarn cli balances

# Check the balance of any account
yarn cli balances --account 0xf17f52151ebef6c7334fad080c5704d77216b732
```

Another example, we can post a buy order:
```bash
# Submit a postBuyOrder of 2500 RDN into WETH-RDN auction
yarn cli buy 2500 WETH-RDN

# INFO-cli Buy 2500 RDN on WETH-RDN (auction 1) using the account 0xf17f52151ebef6c7334fad080c5704d77216b732 +0ms
# INFO-cli The buy was succesful. Transaction: undefined +253ms
```

The state now should show:
* That we bought most of the sell volume
* Now the outstanding volume is smaller. Note that in this case, the outstanding
volume is how much RDN do we need to clear the auction at the current
price.

```
INFO-cli
INFO-cli **********  State of RDN-WETH  **********
INFO-cli  +0ms
INFO-cli  Token pair: RDN-WETH
INFO-cli  +1ms
INFO-cli  Has the token pair been added? Yes +0ms
INFO-cli  State: RUNNING
INFO-cli  +0ms
INFO-cli  Are tokens Approved? +0ms
INFO-cli    - RDN: Yes +0ms
INFO-cli    - WETH: Yes
INFO-cli  +0ms
INFO-cli  State info: +0ms
INFO-cli    - auctionIndex: 1 +0ms
INFO-cli    - auctionStart: 29/08/18 20:03 +1ms
INFO-cli    - It started: 6 hours ago +1ms
INFO-cli    - It will reach the last auction closing price in: 16 minutes +1ms
INFO-cli  +0ms
INFO-cli  Auction RDN-WETH: +0ms
INFO-cli    Is closed: Yes (closed from start) +0ms
INFO-cli    Sell volume: 0 +0ms
INFO-cli  +0ms
INFO-cli  Auction WETH-RDN: +0ms
INFO-cli    Is closed: No +0ms
INFO-cli    Sell volume: +0ms
INFO-cli      sellVolume: 13.057385 WETH +0ms
INFO-cli      sellVolume: 14363.1235 USD +0ms
INFO-cli    Price: +1ms
INFO-cli      Current Price: 252.42997784500481456805 RDN/WETH +0ms
INFO-cli      Closing Price: 245.15812699190978180926 RDN/WETH +0ms
INFO-cli      Price relation: 102.96% +0ms
INFO-cli    Buy volume: +0ms
INFO-cli      buyVolume: 2487.5 RDN +0ms
INFO-cli      Bought percentage: 75.4600 % +0ms
INFO-cli      Outstanding volume: 808.5754062636981 RDN +0ms
INFO-cli
INFO-cli **************************************
```

Enjoy the CLI! These are some other examples to start with:
* `yarn cli balances --account 0xf17f52151ebef6c7334fad080c5704d77216b732`
* `yarn cli state WETH-RDN`
* `yarn cli send 0.5 WETH 0x627306090abaB3A6e1400e9345bC60c78a8BEf57`
* `yarn cli deposit 0.5 WETH`
* `yarn cli deposit 150 RDN`
* `yarn cli sell 100 WETH-RDN`
* `yarn cli buy 100 RDN-WETH`

## Run the tests
```bash
# Launch a ganache-cli in one tab
yarn rpc

# Migrate the contracts
yarn migrate

# Execute the tests
yarn test
```


## Public API
Start API:
```bash
yarn api
```

## Liquidity Bots
Start Bots:
```bash
yarn bots
```

# Testnets or Mainnet
There's scripts for running the `cli`, `bots` and `api` for testnets and rinkeby.

You just add the network like this
```bash
# i.e. Rinkeby
yarn cli-rinkeby --help
yarn bots-rinkeby
yarn api-rinkeby
```

# Run it with docker
One easy way to run the `bots`, the `api`, the `cli` or any other script or
utility of this project is using the docker image we provide:
* You can read how to run it from `dx-services`: [docs/docker.md](docs/docker.md)
* A better approach would be to use the **Docker Image published on Docker Hub**
  * **Dockerhub**:
    [https://hub.docker.com/r/gnosispm/dx-services/](https://hub.docker.com/r/gnosispm/dx-services/)
  * **Example on how to run the CLI**:
    [https://github.com/gnosis/dx-tools](https://github.com/gnosis/dx-tools)
  * **Example on how to run the Bots**:
    [https://github.com/gnosis/dx-examples-liquidity-bots](https://github.com/gnosis/dx-examples-liquidity-bots)

# Scope and main parts of dx-services
It contains five main elements:
* **Model**: Set of convenient wrappers and utilities to provide a simpler way
  to interact with the DutchX.
    * `repositories`: Provide the data access to external data sources like
      the DutchX smart contracts, price feeds, gas price feeds, etc.
      They provide also a more intuitive error handling, that gives detailed
      information about the reasons a smart contract revert a operation.
    * `services`: Provides some common business logic operations to make
      DutchX interaction easier.

* **REST Api**:
  * Exposes the DutchX data in a REST API.
  * The API methods are documented in:
    * [API and it's documentation for Rinkeby](https://dutchx-rinkeby.d.exchange/api)
    * [API and it's documentation for Mainnet](https://dutchx.d.exchange/api)
  * For an example on how to use the API, check [dx-examples-api](https://github.com/gnosis/dx-examples-api)

* **CLI (Command Line Interface)**:
  * Allows to interact with the DutchX from the command line.
  * Allows to perform operations to retrieve the DutchX state from any Ethereum
    network
  * Also, allow to fund accounts, deposit tokens into the DutchX, participate
    in an auction as a seller or a buyer and much more.
  * For an example on how to use the CLI, check [dx-examples-liquidity-bots](https://github.com/gnosis/dx-examples-liquidity-bots)

* **Liquidity Bots**
  * Allows to launch bots watching certain token pairs with the goal of ensuring
    minimal market liquidity.
  * The bots will automatically participate in the auctions using the provided
    configuration.
  * For documentation about the bots, and example on how to run your own bots,
    check [dx-examples-liquidity-bots](https://github.com/gnosis/dx-examples-liquidity-bots)

* **Scheduled tasks**:
  * Allow to execute certain tasks at certain times.
  * **Used for Reporting**: Allows to send reports periodically with the
    information of the lasts auctions and the actions the bots has been taking.
  * **Used for Autoclaiming**: Allows the bots to claim their funds of past
    auctions so they can reuse them in the upcoming ones.

# License
This project is released under [MIT License](./LICENSE.md)

# Security and Liability
All the code is provided WITHOUT ANY WARRANTY; without even the implied warranty
 of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

# Contributors
- Stefan ([Georgi87](https://github.com/Georgi87))
- Martin ([koeppelmann](https://github.com/koeppelmann))
- Anxo ([anxolin](https://github.com/anxolin))
- Dani ([dasanra](https://github.com/dasanra))
- Dominik ([dteiml](https://github.com/dteiml))
- David ([W3stside](https://github.com/w3stside))
- Dmitry ([Velenir](https://github.com/Velenir))
- Alexander ([josojo](https://github.com/josojo))
