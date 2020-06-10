import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gc-whitelist-gnosis-ui-task-specs",
  `Returns a hardcoded task spec for the tradeAndWithdraw Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "rinkeby") throw new Error("\nwrong network!");

      // Collect all task specs
      const taskSpecs = [];
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
