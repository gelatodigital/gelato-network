#!/bin/sh
export SELL_TOKEN="WETH"
export BUY_TOKEN="RDN"
export SKIP_TIME=6

echo "###############################################################################\n"
echo "\n            SKIP 6 HOURS SCRIPT \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            State of ${SELL_TOKEN}-${BUY_TOKEN} BEFORE skipping\n"
echo "###############################################################################\n"

STATE_BEFORE=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_BEFORE}\n"

echo "###############################################################################\n"
echo "\n            Skipping ${SKIP_TIME} hours ahead\n"
echo "###############################################################################\n"

SKIP_OUTPUT=`yarn cli2 --time ${SKIP_TIME}`
echo "\n{$SKIP_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n            State of ${SELL_TOKEN}-${BUY_TOKEN} AFTER skipping\n"
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_AFTER}\n"

echo "###############################################################################\n"
echo "\n            SKIP 6 HOURS SCRIPT : END \n"
echo "###############################################################################\n"