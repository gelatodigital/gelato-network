#!/bin/sh
export DEFAULT_ACCOUNT="0x627306090abab3a6e1400e9345bc60c78a8bef57"
export PRIMARY_TOKEN="WETH"
export PRIMARY_TOKEN_AMOUNT="10"
export SECONDARY_TOKEN="RDN"
export SECONDARY_TOKEN_AMOUNT="1000"

echo "###############################################################################\n"
echo "\n            START AUCTION SCRIPT \n"
echo "###############################################################################\n"

#echo "###############################################################################\n"
#echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} BEFORE startAuction.sh\n"
#echo "###############################################################################\n"

#STATE_BEFORE=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
#echo "\n{$STATE_BEFORE}\n"


#echo "###############################################################################\n"
#echo "\nDepositing ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN} into ${DEFAULT_ACCOUNT}\n"
#echo "###############################################################################\n"

DEPOSIT_OUTPUT1=`yarn cli deposit ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}`
#echo "\n{$DEPOSIT_OUTPUT1}\n"

#echo "###############################################################################\n"
#echo "\nSelling ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}\nvia ${DEFAULT_ACCOUNT}\n"
#echo "###############################################################################\n"

SELL_OUTPUT1=`yarn cli sell ${PRIMARY_TOKEN_AMOUNT} ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} ${DEFAULT_ACCOUNT}`
#echo "\n{$SELL_OUTPUT1}\n"



#echo "###############################################################################\n"
#echo "\nDepositing ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN} on the DutchX\nvia ${DEFAULT_ACCOUNT}\n"
#echo "###############################################################################\n"

DEPOSIT_OUTPUT2=`yarn cli deposit ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN}`
#echo "\n${DEPOSIT_OUTPUT2}\n"

#echo "###############################################################################\n"
#echo "\nSelling ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN} on the DutchX\nvia ${DEFAULT_ACCOUNT}"
#echo "###############################################################################\n"

SELL_OUTPUT2=`yarn cli sell ${SECONDARY_TOKEN_AMOUNT} ${SECONDARY_TOKEN}-${PRIMARY_TOKEN} ${DEFAULT_ACCOUNT}`
#echo "\n{$SELL_OUTPUT2}\n"

#echo "###############################################################################\n"
#echo "\n            State of ${PRIMARY_TOKEN}-${SECONDARY_TOKEN} AFTER auctionStart.sh\n
#                       Should be: WAITING_FOR_AUCTION_TO_START"
#echo "###############################################################################\n"

#STATE_AFTER=`yarn cli state ${PRIMARY_TOKEN}-${SECONDARY_TOKEN}`
#echo "\n{$STATE_AFTER}\n"


echo "###############################################################################\n"
echo "\n            START AUCTION SCRIPT: END\n"
echo "###############################################################################\n"
