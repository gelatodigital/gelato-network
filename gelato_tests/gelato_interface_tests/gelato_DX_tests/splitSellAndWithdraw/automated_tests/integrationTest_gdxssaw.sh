#!/bin/sh

echo "###############################################################################\n"
echo "\n        GELATODX_SPLITSELLANDWITHDRAW AUTOMATED INTEGRATION TEST SCRIPT \n"
echo "###############################################################################\n"

ENDOW_OUTPUT=`./gelato_tests/gelato_interface_tests/gelato_DX_tests/splitSellAndWithdraw/automated_tests/endow_gdxssaw_seller.sh`
echo "\n${ENDOW_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n                    TRUFFLE TEST  \n"
echo "###############################################################################\n"

TEST_OUTPUT=`truffle test gelato_tests/gelato_interface_tests/gelato_DX_tests/splitSellAndWithdraw/automated_tests/integrationTest_gdxssaw.js`
echo "\n${TEST_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n                    TRUFFLE TEST END \n"
echo "###############################################################################\n"


echo "###############################################################################\n"
echo "\n        GELATODX_SPLITSELLANDWITHDRAW AUTOMATED INTEGRATION TEST SCRIPT END \n"
echo "###############################################################################\n"