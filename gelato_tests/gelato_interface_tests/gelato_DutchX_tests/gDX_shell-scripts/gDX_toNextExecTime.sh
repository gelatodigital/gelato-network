#!/bin/sh
# Script to automatically go through stage2 of the testing procedure:
#   We have just executed a subOrder and now we:
#       1. Start a new auction
#       2. Skip ahead 6 hours
#       3. Close that auction
#  If we invested during the previous waiting period we can execureAndWithdraw again.
export SKIP_TIME=6

# Start Auction
START_OUTPUT=`yarn gdx-start-auction`
#echo "\n{$STATE_BEFORE}\n"

# Skip Ahead
SKIP_OUTPUT=`yarn gdx-skip`
#echo "\n{$SKIP_OUTPUT}\n"

# Close Auction
# We need to reassign to SECONDARY_TOKEN_AMOUNT
#   to make sure we buy up enough to close the auction
export SECONDARY_TOKEN_AMOUNT="10000"

CLOSE_OUTPUT=`yarn gdx-close-auction`
echo "\n{$CLOSE_OUTPUT}\n"

