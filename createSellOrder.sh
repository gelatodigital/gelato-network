#!/bin/sh
export SELLER="0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE"

echo "****************************************\n"
echo "\n            CREATE SELL ORDER SCRIPT \n
        create sell order with seller account: ${SELLER} \n"
echo "****************************************\n"

echo "****************************************\n"
echo "\n\nBash script running createSellorder.sh | createSellOrder.js logic....\n"
echo "****************************************\n"

SELLORDER_OUTPUT=`truffle exec ./createSellOrder.js`
echo "\n{$SELLORDER_OUTPUT}\n"

echo "****************************************\n"
echo "\n            CREATE SELL ORDER SCRIPT: END \n"
echo "****************************************\n"