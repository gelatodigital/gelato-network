# Gelato Dev - Testing Environment

## Based on
Check out the [Gnosis DX-Services](https://github.com/gnosis/dx-services).

## Setup test environment
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

Let's fund the sellers account with some WETH:
```bash
yarn cli deposit 20 WETH 0x627306090abab3a6e1400e9345bc60c78a8bef57
yarn cli withdraw 20 WETH 0x627306090abab3a6e1400e9345bc60c78a8bef57
```

Create the first sellOrder using the sellers account:
```bash
truffle console
exec ./createSellOrder.js
.exit
```

Fast forward in time and close the currently running auction
```bash
yarn cli2 --time 6
yarn cli deposit 5000 RDN 0xf17f52151ebef6c7334fad080c5704d77216b732
yarn cli buy 5000 WETH-RDN 0xf17f52151ebef6c7334fad080c5704d77216b732
```

Check the current state, enter truffle console and execute the first subOrder in auction 2 of WETH-RDN
```bash
yarn cli state WETH-RDN  
truffle console
exec ./execSubOrder.js
.exit
```
Fund the corresponding RDN-WETH auction and check the state
```bash
yarn cli deposit 5000 RDN 0xf17f52151ebef6c7334fad080c5704d77216b732
yarn cli sell 5000 RDN-WETH 0xf17f52151ebef6c7334fad080c5704d77216b732
yarn cli state WETH-RDN 
```

## Setup complete

## Help

```bash
# Print out available CLI  commands
yarn cli --help

# Or, get help from a specific command from it
yarn cli buy --help
```

## Based on code from
- Stefan ([Georgi87](https://github.com/Georgi87))
- Martin ([koeppelmann](https://github.com/koeppelmann))
- Anxo ([anxolin](https://github.com/anxolin))
- Dani ([dasanra](https://github.com/dasanra))
- Dominik ([dteiml](https://github.com/dteiml))
- David ([W3stside](https://github.com/w3stside))
- Dmitry ([Velenir](https://github.com/Velenir))
- Alexander ([josojo](https://github.com/josojo))
