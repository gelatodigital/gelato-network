#!/bin/sh

echo "###############################################################################\n"
echo "\n            SPLIT SELL ORDER SCRIPT \n"
echo "###############################################################################\n"

echo "###############################################################################\n"
echo "\n\nBash script running splitSellOrder.js logic....\n"
echo "###############################################################################\n"

SPLITSELLORDER_OUTPUT=`truffle exec gelato_tests/gelato_interface_tests/gelato_DutchX_tests/gDX_tests/gDX_integrationTest/gDX_splitSellOrder.js`
echo "\n{$SPLITSELLORDER_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n            SPLIT SELL ORDER: END \n"
echo "###############################################################################\n"