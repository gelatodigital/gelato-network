#!/bin/sh
export DEFAULT_ACCOUNT="0x627306090abab3a6e1400e9345bc60c78a8bef57"  # ganache accounts[0]
export SELLER=$SELLER  # ganache accounts[2]
export SELL_AMOUNT="20"
export SELL_TOKEN="WETH"

echo "###############################################################################\n"
echo "\n            ENDOW GDXSSAW SELLER: \n
            endowing seller with ${SELL_AMOUNT} ${SELL_TOKEN} \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\nSeller account: ${SELLER}\n"

echo "\n\nBash script running endowSeller.sh logic....\n\n"
echo "###############################################################################\n"


echo "###############################################################################\n"
echo "\nDepositing ${SELL_AMOUNT} ${SELL_TOKEN} into ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

DEPOSIT_OUTPUT=`yarn cli deposit ${SELL_AMOUNT} ${SELL_TOKEN} ${DEFAULT_ACCOUNT}`
echo "\n{$DEPOSIT_OUTPUT}\n"


echo "###############################################################################\n"
echo "\nWithdrawing ${SELL_AMOUNT} ${SELL_TOKEN} from ${DEFAULT_ACCOUNT}\n"
echo "###############################################################################\n"

WITHDRAW_OUTPUT=`yarn cli withdraw ${SELL_AMOUNT} ${SELL_TOKEN} ${DEFAULT_ACCOUNT}`
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
echo "\n            ENDOW GDXSSAW SELLER: END \n"
echo "###############################################################################\n"

