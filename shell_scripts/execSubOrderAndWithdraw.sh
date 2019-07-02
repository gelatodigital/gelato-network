#!/bin/sh
export SELL_ORDER_HASH="$1"
export SELLER="0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE"
export SELL_TOKEN="WETH"
export BUY_TOKEN="RDN"

echo "###############################################################################\n"
echo "\n            EXEC SUBORDER AND WITHDRAW SCRIPT \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            State of ${SELL_TOKEN}-${BUY_TOKEN} BEFORE execSubOrderAndWithdraw\n"
echo "###############################################################################\n"

STATE_BEFORE=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_BEFORE}\n"

echo "###############################################################################\n"
echo "\n        Check seller balance ${SELL_TOKEN} & ${BUY_TOKEN}  BEFORE execSubOrderAndWithdraw\n"
echo "###############################################################################\n"

BALANCE_BEFORE=`yarn cli balances --account ${SELLER}`
echo "\n{$BALANCE_BEFORE}\n"

echo "###############################################################################\n"
echo "\n            Running execSubOrderAndWithdraw \n
Sell Order Hash: ${SELL_ORDER_HASH}\n"
echo "###############################################################################\n"

EXEC_OUTPUT=`truffle exec ./execSubOrderAndWithdraw.js ${SELL_ORDER_HASH}`
echo "\n{$EXEC_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n            State of ${SELL_TOKEN}-${BUY_TOKEN} AFTER execSubOrderAndWithdraw\n
            ${SELL_TOKEN} sell volume should have gone up buy SELL_AMOUNT - Fees "
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_AFTER}\n"

echo "###############################################################################\n"
echo "\n   Check seller balance ${SELL_TOKEN} & ${BUY_TOKEN} AFTER execSubOrderAndWithdraw\n
Seller: ${SELLER}
    ${SELL_TOKEN} balance should have gone down by per sub order amount now locked in the DutchX.
    ${BUY_TOKEN} balance should have gone up by withdrawal amount BUT ONLY IF:
    - This was NOT the first sub order execution (first withdrawal only after seller's first auction cleared)
    - and if the seller (or on behalf of) did NOT WITHDRAW MANUALLY in the interim
\n"
echo "###############################################################################\n"

BALANCE_AFTER=`yarn cli balances --account ${SELLER}`
echo "\n{$BALANCE_AFTER}\n"

echo "###############################################################################\n"
echo "\n            EXEC SUBORDER AND WITHDRAW SCRIPT: END \n"
echo "###############################################################################\n"