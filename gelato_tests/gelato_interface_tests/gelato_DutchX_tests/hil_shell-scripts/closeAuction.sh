#!/bin/sh
# export DEFAULT_ACCOUNT="0x627306090abab3a6e1400e9345bc60c78a8bef57"
# export SELL_TOKEN="WETH"
# export SELL_AMOUNT="20"
# export BUY_TOKEN="RDN"
# export BUY_AMOUNT="10000"

echo "###############################################################################\n"
echo "\n            CLOSE AUCTION SCRIPT \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            State of ${SELL_TOKEN}-${BUY_TOKEN} BEFORE closeAuction.sh\n
            Caution: auction should be RUNNING and 6 hours in \n"
echo "###############################################################################\n"

STATE_BEFORE=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_BEFORE}\n"


echo "###############################################################################\n"
echo "\nDepositing ${SELL_AMOUNT} ${SELL_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT1=`yarn cli deposit ${SELL_AMOUNT} ${SELL_TOKEN}`
echo "\n{$DEPOSIT_OUTPUT1}\n"

echo "###############################################################################\n"
echo "\nBuying ${SELL_AMOUNT} ${SELL_TOKEN} worth of ${BUY_TOKEN}\n
via ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

BUY_OUTPUT1=`yarn cli buy ${SELL_AMOUNT} ${BUY_TOKEN}-${SELL_TOKEN}`
echo "\n{$BUY_OUTPUT1}\n"



echo "###############################################################################\n"
echo "\nDepositing ${BUY_AMOUNT} ${BUY_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT2=`yarn cli deposit ${BUY_AMOUNT} ${BUY_TOKEN}`
echo "\n${DEPOSIT_OUTPUT2}\n"

echo "###############################################################################\n"
echo "\nBuying ${BUY_AMOUNT} ${BUY_TOKEN} worth of ${SELL_TOKEN}\n
via ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

BUY_OUTPUT2=`yarn cli buy ${BUY_AMOUNT} ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$BUY_OUTPUT2}\n"

echo "###############################################################################\n"
echo "\n            State of ${SELL_TOKEN}-${BUY_TOKEN} AFTER closeAuction.sh\n

                    Caution: should be WAITING_FOR_FUNDING and index++\n"
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${SELL_TOKEN}-${BUY_TOKEN}`
echo "\n{$STATE_AFTER}\n"


echo "###############################################################################\n"
echo "\n            CLOSE AUCTION SCRIPT: END\n"
echo "###############################################################################\n"
