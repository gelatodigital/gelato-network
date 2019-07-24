#!/bin/sh

echo "###############################################################################\n"
echo "\n        GELATODX_SPLITSELLANDWITHDRAW TRUFFLE INTEGRATION TEST SCRIPT \n"
echo "###############################################################################\n"

ENDOW_OUTPUT=`./gelato_tests/gelato_interface_tests/gelato_DutchX_tests/gDX_shell-scripts/gDX_endowSeller.sh`
echo "\n${ENDOW_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n                    TRUFFLE TEST  \n"
echo "###############################################################################\n"

TEST_OUTPUT=`truffle test gelato_tests/gelato_interface_tests/gelato_DutchX_tests/gDX_truffle_tests/gDX_truffle_integration_tests/gDX_truffle_integrationTest.js`
echo "\n${TEST_OUTPUT}\n"

echo "###############################################################################\n"
echo "\n                    TRUFFLE TEST END \n"
echo "###############################################################################\n"


echo "###############################################################################\n"
echo "\n        GELATODX_SPLITSELLANDWITHDRAW TRUFFLE INTEGRATION TEST SCRIPT END \n"
echo "###############################################################################\n"