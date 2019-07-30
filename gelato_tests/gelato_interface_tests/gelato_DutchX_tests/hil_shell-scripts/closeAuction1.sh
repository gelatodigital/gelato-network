#!/bin/sh
# export SELL_TOKEN="WETH"
# export BUY_TOKEN="RDN"
# export SELL_AMOUNT="20"
# export BUY_AMOUNT="4000"
# export SKIP_TIME=6

echo "###############################################################################\n"
echo "\n            CLOSING AUCTION 1 SCRIPT \n"
echo "###############################################################################\n"

echo `yarn cli2 --time ${SKIP_TIME}`
echo `yarn cli deposit ${BUY_AMOUNT} ${BUY_TOKEN}`
echo `yarn cli buy ${BUY_AMOUNT} ${SELL_TOKEN}-${BUY_TOKEN}`


echo "###############################################################################\n"

echo "\nState of ${SELL_TOKEN}-${BUY_TOKEN} AFTER closing
   --> should be WAITING_FOR_FUNDING with auction index 2.\n"
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_AFTER}\n"

echo "###############################################################################\n"
echo "\n            CLOSING AUCTION 1 SCRIPT : END \n"
echo "###############################################################################\n"
