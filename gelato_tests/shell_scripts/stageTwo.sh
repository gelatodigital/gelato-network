#!/bin/sh
# Script to automatically go through stage2 of the testing procedure:
#   We have just executed a subOrder and now we:
#       1. Start a new auction
#       2. Skip ahead 6 hours
#       3. Close that auction
#  If we invested during the previous waiting period we can execureAndWithdraw again.
export DEFAULT_ACCOUNT="0x627306090abab3a6e1400e9345bc60c78a8bef57"
export PRIMARY_TOKEN="WETH"
export PRIMARY_TOKEN_AMOUNT="10"
export SECONDARY_TOKEN="RDN"
export SECONDARY_TOKEN_AMOUNT="1000"
export SKIP_TIME=6

echo "###############################################################################\n"
echo "\n            START AUCTION SCRIPT \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} BEFORE startAuction.sh\n"
echo "###############################################################################\n"

STATE_BEFORE=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
echo "\n{$STATE_BEFORE}\n"

echo "###############################################################################\n"
echo "\nDepositing ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT1=`yarn cli deposit ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}`
echo "\n{$DEPOSIT_OUTPUT1}\n"

echo "###############################################################################\n"
echo "\nSelling ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}\nvia ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

SELL_OUTPUT1=`yarn cli sell ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} ${DEFAULT_ACCOUNT}`
echo "\n{$SELL_OUTPUT1}\n"


echo "###############################################################################\n"
echo "\nDepositing ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN} on the DutchX\nvia ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT2=`yarn cli deposit ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN}`
echo "\n${DEPOSIT_OUTPUT2}\n"

echo "###############################################################################\n"
echo "\nSelling ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN} on the DutchX\nvia ${DEFAULT_ACCOUNT}"
echo "###############################################################################\n"

SELL_OUTPUT2=`yarn cli sell ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN}-${PRIMARY_TOKEN} ${DEFAULT_ACCOUNT}`
echo "\n{$SELL_OUTPUT2}\n"

echo "###############################################################################\n"
echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} AFTER auctionStart.sh\n
                        Should be: WAITING_FOR_AUCTION_TO_START"
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
echo "\n{$STATE_AFTER}\n"

echo "###############################################################################\n"
echo "\n            START AUCTION SCRIPT: END\n"
echo "###############################################################################\n"



echo "###############################################################################\n"
echo "\n            SKIP 6 HOURS SCRIPT \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} BEFORE skipping\n"
echo "###############################################################################\n"

STATE_BEFORE=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
echo "\n{$STATE_BEFORE}\n"

echo "###############################################################################\n"
echo "\n            Skipping ${SKIP_TIME} hours ahead\n"
echo "###############################################################################\n"

SKIP_OUTPUT=`yarn cli2 --time ${SKIP_TIME}`
echo "\n{$SKIP_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} AFTER skipping\n"
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
echo "\n{$STATE_AFTER}\n"

echo "###############################################################################\n"
echo "\n            SKIP 6 HOURS SCRIPT : END \n"
echo "###############################################################################\n"



echo "###############################################################################\n"
echo "\n            CLOSE AUCTION SCRIPT \n"
echo "###############################################################################\n"

# We need to reassign to SECONDARY_TOKEN_AMOUNT
#   to make sure we buy up enough to close the auction
export SECONDARY_TOKEN_AMOUNT="10000"

echo "###############################################################################\n"
echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} BEFORE closeAuction.sh\n
            Caution: auction should be RUNNING and 6 hours in \n"
echo "###############################################################################\n"

STATE_BEFORE=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
echo "\n{$STATE_BEFORE}\n"


echo "###############################################################################\n"
echo "\nDepositing ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT1=`yarn cli deposit ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}`
echo "\n{$DEPOSIT_OUTPUT1}\n"

echo "###############################################################################\n"
echo "\nBuying ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN} worth of ${SECONDARY_TOKEN}\n
via ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

BUY_OUTPUT1=`yarn cli buy ${PRIMARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN}-${PRIMARY_TOKEN}`
echo "\n{$BUY_OUTPUT1}\n"



echo "###############################################################################\n"
echo "\nDepositing ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT2=`yarn cli deposit ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN}`
echo "\n${DEPOSIT_OUTPUT2}\n"

echo "###############################################################################\n"
echo "\nBuying ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN} worth of ${PRIMARY_TOKEN}\n
via ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

BUY_OUTPUT2=`yarn cli buy ${SECONDARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
echo "\n{$BUY_OUTPUT2}\n"

echo "###############################################################################\n"
echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} AFTER closeAuction.sh\n
                    Caution: should be WAITING_FOR_FUNDING and index++\n"
echo "###############################################################################\n"

STATE_AFTER=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
echo "\n{$STATE_AFTER}\n"


echo "###############################################################################\n"
echo "\n            CLOSE AUCTION SCRIPT: END\n"
echo "###############################################################################\n"