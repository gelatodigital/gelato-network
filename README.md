# Gelato Dev - Testing Environment

## Based on
Check out the [Gnosis DX-Services](https://github.com/gnosis/dx-services).

## Setup test environment
```bash
# Install dependencies
yarn install

# In one tab, run a local Ganache
yarn rpc

# In the other tab:
# run the setup script, which will:
#   - migrate all contracts into your local node
#   - create some test data, basically:
#       - I'll fund the the second account of generated with the mnemonic, so
#         it has some funds for trading
#       - It'll add a RDN-WETH token pair into the DX
#       - It'll make sure RDN-WETH is running. It'll automatically advance time,
#         or participate in the auctions if it's required
yarn setup
```

Let's fund the sellers account with some WETH (seller: 0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE):
```bash
yarn cli deposit 200 WETH 0x627306090abab3a6e1400e9345bc60c78a8bef57
yarn cli withdraw 200 WETH 0x627306090abab3a6e1400e9345bc60c78a8bef57
yarn cli send 200 WETH 0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE
```

Create the first sellOrder using the sellers account (accounts[0]:
```bash
truffle exec ./createSellOrder.js
```

Fast forward in time 6 hours (freeze time) and close the currently running auction
```bash
yarn cli2 --time 6
yarn cli deposit 4000 RDN 0xf17f52151ebef6c7334fad080c5704d77216b732
yarn cli buy 4000 WETH-RDN 0xf17f52151ebef6c7334fad080c5704d77216b732
```

Check the current state for AUCTION_START_WAITING_FOR_FUNDING and auction index should be 2.
Then execute the first subOrder as the executor (accounts[1]) in auction 2 of WETH-RDN.
```bash
yarn cli state WETH-RDN
truffle exec ./execSubOrderAndWithdraw.js "**** PLUG IN SELL ORDER HASH  ******"
```
Do not forget to wrap the sell order hash in "..."!

Now the Sell Volume of WETH-RDN should have some WETH (~9.95 WETH) from the just executed subOrder.

If you want to go on and execute further sub Orders, you need to progress through
various auction states buy funding both auctions (WETH-RDN and RDN-WETH),
skipping ahead 7 hours, and then placing buy orders to close both auctions.
When you execute the next sub Order, always make sure there is enough WETH
in the seller account (default account: accounts[0]).

Here are some useful commands for copy pasting in order (LOOP START):
```bash
yarn cli deposit 1000 RDN "0xf17f52151ebef6c7334fad080c5704d77216b732"
yarn cli sell 1000 RDN-WETH "0xf17f52151ebef6c7334fad080c5704d77216b732"
yarn cli2 --time 6

yarn cli deposit 4000 RDN "0xf17f52151ebef6c7334fad080c5704d77216b732"
yarn cli buy 4000 WETH-RDN "0xf17f52151ebef6c7334fad080c5704d77216b732"
yarn cli deposit 5 WETH "0xf17f52151ebef6c7334fad080c5704d77216b732"
yarn cli buy 5 RDN-WETH "0xf17f52151ebef6c7334fad080c5704d77216b732"

yarn cli balances
```

Now either execute subOrder or withdraw manually
```bash
truffle exec ./execSubOrderAndWithdraw.js "**** PLUG IN SELL ORDER HASH  ******"

OR

truffle exec ./withdrawManually.js "**** PLUG IN SELL ORDER HASH  ******"
truffle exec ./execSubOrderAndWithdraw.js  "**** PLUG IN SELL ORDER HASH  ******"
```

Check balance of seller (LOOP END - start from LOOP START)
```bash
yarn cli balances --account 0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE
```

Other comments to try out:
```bash
truffle exec ./calcWithdrawAmount.js
truffle exec ./calcSubOrder.js
```


...
...

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
