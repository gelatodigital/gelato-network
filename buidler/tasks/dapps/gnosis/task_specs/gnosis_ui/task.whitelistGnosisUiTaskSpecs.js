import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gelato-whitelist-gnosis-ui-task-specs",
  `Returns a hardcoded task spec for the tradeAndWithdraw Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "rinkeby") throw new Error("\nwrong network!");

      // Collect all task specs
      const taskSpecs = [
        "balance-trade-ui",
        "kyber-price-trade-ui",
        "time-trade-ui",
        "withdraw-ui",
      ];

      for (const taskSpecName of taskSpecs) {
        await run("gelato-whitelist-taskspec", {
          name: taskSpecName,
        });
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
