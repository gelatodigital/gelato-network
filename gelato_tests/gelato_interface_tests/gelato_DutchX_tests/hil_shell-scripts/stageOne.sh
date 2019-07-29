#!/bin/sh
# Script to automatically go through stage1 of the testing procedure:
# Creating a sell order and closing the auction to get us to a state
#  where we can run the first execSubOrderAndWithdraw.
export DEFAULT_ACCOUNT="0x627306090abab3a6e1400e9345bc60c78a8bef57"
export SELLER="0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE"
export SELL_TOKEN="WETH"
export BUY_TOKEN="RDN"
export SELL_AMOUNT="20"
export BUY_AMOUNT="4000"
export SKIP_TIME=6

echo "###############################################################################\n"
echo "\n            ENDOW SELLER SCRIPT: \n
            endowing seller with ${SELL_AMOUNT} ${SELL_TOKEN} \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\nSeller account: ${SELLER}\n"

echo "\n\nBash script running endowSeller.sh logic....\n\n"
echo "###############################################################################\n"


echo "###############################################################################\n"
echo "\nDepositing ${SELL_AMOUNT} ${SELL_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT=`yarn cli deposit ${SELL_AMOUNT} ${SELL_TOKEN}`
echo "\n{$DEPOSIT_OUTPUT}\n"


echo "###############################################################################\n"
echo "\nWithdrawing ${SELL_AMOUNT} ${SELL_TOKEN} from ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

WITHDRAW_OUTPUT=`yarn cli withdraw ${SELL_AMOUNT} ${SELL_TOKEN}`
echo "\n{$WITHDRAW_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n             Take a look at seller balance of WETH\n"
echo "###############################################################################\n"

SELLER_BALANCE_BEFORE=`yarn cli balances --account ${SELLER}`
echo "\n{$SELLER_BALANCE_BEFORE}\n"


echo "###############################################################################\n"
echo "\nSending ${SELL_AMOUNT} ${SELL_TOKEN} to seller (${SELLER})\n"
echo "###############################################################################\n"

SEND_OUTPUT=`yarn cli send ${SELL_AMOUNT} ${SELL_TOKEN} ${SELLER}`
echo "\n{$SEND_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n            Check if seller balance went up by ${SELL_AMOUNT} ${SELL_TOKEN}\n"
echo "###############################################################################\n"

SELLER_BALANCE_AFTER=`yarn cli balances --account ${SELLER}`
echo "\n{$SELLER_BALANCE_AFTER}\n"

echo "###############################################################################\n"
echo "\n            ENDOW SELLER SCRIPT: END \n"
echo "###############################################################################\n"




# echo "###############################################################################\n"
# echo "\n            CREATE SELL ORDER SCRIPT \n"
# echo "###############################################################################\n"

# echo "###############################################################################\n"
# echo "\n\nBash script running createSellorder.sh | createSellOrder.js logic....\n
# seller account: ${SELLER}\n"
# echo "###############################################################################\n"

# SELLORDER_OUTPUT=`truffle exec ./gelato_tests/createSellOrder.js`
# echo "\n{$SELLORDER_OUTPUT}\n"

# echo "###############################################################################\n"
# echo "\n            CREATE SELL ORDER SCRIPT: END \n"
# echo "###############################################################################\n"




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




echo "###############################################################################\n"
echo "\n            CLOSING AUCTION 1 SCRIPT \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\nDepositing ${BUY_AMOUNT} ${BUY_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT=`yarn cli deposit ${BUY_AMOUNT} ${BUY_TOKEN}`
echo "\n{$DEPOSIT_OUTPUT}\n"

echo "###############################################################################\n"
echo "\nBuying ${BUY_AMOUNT} ${BUY_TOKEN} from running ${SELL_TOKEN}-${BUY_TOKEN} auction\n
from buyer acount: ${DEFAULT_ACCOUNT}"
echo "###############################################################################\n"

SEND_OUTPUT=`yarn cli buy ${BUY_AMOUNT} ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$SEND_OUTPUT}\n"

echo "###############################################################################\n"
echo "\nState of ${SELL_TOKEN}-${BUY_TOKEN} AFTER closing
   --> should be WAITING_FOR_FUNDING with auction index 2.\n"
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_AFTER}\n"

echo "###############################################################################\n"
echo "\n            CLOSING AUCTION 1 SCRIPT : END \n"
echo "###############################################################################\n"