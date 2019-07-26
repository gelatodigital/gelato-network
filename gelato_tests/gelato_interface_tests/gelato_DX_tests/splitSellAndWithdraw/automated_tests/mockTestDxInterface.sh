#!/bin/sh
export DEFAULT_ACCOUNT="0x627306090abab3a6e1400e9345bc60c78a8bef57"  # ganache accounts[0]
export SELLER="0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"  # ganache accounts[2]
export SELL_AMOUNT="20"
export SELL_TOKEN="WETH"
export EXECUTION_CLAIM="1"
export CLAIM_STATE_ID="1"


echo "###############################################################################\n"
echo "\n            MOCKTESTDXINTERFACE.sh: \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            YARN SETUP: START \n"
YARN_SETUP=`yarn setup`
echo "\n${YARN_SETUP}\n"
echo "###############################################################################\n"
echo "\n            YARN SETUP: END \n"

echo "###############################################################################\n"
echo "\n            CLOSE CURRENT AUCTION START\n"
CLOSE_AUCTION=`yarn close1`
echo "\n${CLOSE_AUCTION}\n"
echo "###############################################################################\n"
echo "\n            CLOSE CURRENT AUCTION END \n"

echo "###############################################################################\n"
echo "\n            ENDOW Gelato DX SELLER: \n
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


echo "###############################################################################\n"
echo "\nSending ${SELL_AMOUNT} ${SELL_TOKEN} to seller (${SELLER})\n"
echo "###############################################################################\n"

SEND_OUTPUT=`yarn cli send ${SELL_AMOUNT} ${SELL_TOKEN} ${SELLER}`
echo "\n{$SEND_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n            Check if seller balance went up by ${SELL_AMOUNT} ${SELL_TOKEN}\n"
echo "###############################################################################\n"


echo "###############################################################################\n"
echo "\n            ENDOW SELLER: END \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            Move files out of migrations"
MOVE_OUT_M_1=`mv ./migrations/2_DEV_migrate_dependencies.js ./2_DEV_migrate_dependencies.js`
MOVE_OUT_M_2=`mv ./migrations/3_deploy_gelato.js ./3_deploy_gelato.js`
MOVE_OUT_M_3=`mv ./migrations/4_deploy_mockExchange.js ./4_deploy_mockExchange.js`
echo "\n${MOVE_OUT_M_1}\n \n${MOVE_OUT_M_2}\n \n${MOVE_OUT_M_3}\n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            RUN TRUFFL TEST SCRIPT: splitSellOrderTest.JS \n"
echo "###############################################################################\n"

TRUFFLE_TEST_SPLIT=`truffle test ./test/splitSellOrderTest.js`
echo "\n${TRUFFLE_TEST_SPLIT}\n"

echo "###############################################################################\n"
echo "\n            TRUFFLE TEST splitSellOrderTest END \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            Set EXECUTION_CLAIM to 1"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            RUN TRUFFL TEST SCRIPT: test/executeTest.js \n"
echo "###############################################################################\n"

TRUFFLE_TEST_EXEC=`truffle test ./test/executeTest.js`
echo "\n${TRUFFLE_TEST_EXEC}\n"

echo "###############################################################################\n"
echo "\n            TRUFFLE TEST END test/executeTest.js \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            START AND CLOSE CURRENT AUCTION START\n"
YARN_STAGE_2=`yarn stage2`
echo "\n${YARN_STAGE_2}\n"
echo "###############################################################################\n"
echo "\n            START AND CLOSE END \n"

echo "###############################################################################\n"
echo "\n            MANUAL WITHDRAW: ./manualWithdrawTest.js \n"
echo "###############################################################################\n"

export EXECUTION_CLAIM="2"
TRUFFLE_TEST_WITHDRAW=`truffle test ./test/manualWithdrawTest.js`
echo "\n${TRUFFLE_TEST_WITHDRAW}\n"

echo "###############################################################################\n"
echo "\n            MANUAL WITHDRAW: ./manualWithdrawTest.js \n"
echo "###############################################################################\n"


echo "###############################################################################\n"
echo "\n            RUN TRUFFL TEST SCRIPT 2 : test/executeTest.js \n"
echo "###############################################################################\n"

TRUFFLE_TEST_EXEC=`truffle test ./test/executeTest.js`
echo "\n${TRUFFLE_TEST_EXEC}\n"

echo "###############################################################################\n"
echo "\n            TRUFFLE TEST END test/executeTest.js \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            START AND CLOSE CURRENT AUCTION START\n"
YARN_STAGE_2=`yarn stage2`
echo "\n${YARN_STAGE_2}\n"
echo "###############################################################################\n"
echo "\n            START AND CLOSE END \n"


echo "###############################################################################\n"
echo "\n            RUN TRUFFL TEST SCRIPT 3 : test/executeTest.js \n"
echo "###############################################################################\n"

export EXECUTION_CLAIM="3"
TRUFFLE_TEST_EXEC=`truffle test ./test/executeTest.js`
echo "\n${TRUFFLE_TEST_EXEC}\n"

echo "###############################################################################\n"
echo "\n            TRUFFLE TEST END test/executeTest.js \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n            Move files back into migrations"
MOVE_IN_M_1=`mv ./2_DEV_migrate_dependencies.js ./migrations/2_DEV_migrate_dependencies.js`
MOVE_IN_M_2=`mv ./3_deploy_gelato.js ./migrations/3_deploy_gelato.js`
MOVE_IN_M_3=`mv ./4_deploy_mockExchange.js ./migrations/4_deploy_mockExchange.js`
echo "\n${MOVE_IN_M_1}\n \n${MOVE_IN_M_2}\n \n${MOVE_IN_M_3}\n"
echo "###############################################################################\n"