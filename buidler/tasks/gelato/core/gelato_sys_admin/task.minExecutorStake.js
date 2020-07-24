import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-minExecutorStake",
  `Return (or --log) GelatoCore.minExecutorStake() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const minExecutorStake = await gelatoCore.minExecutorStake();
      if (log) {
        console.log(`
          \n minExecutorStake:       ${utils.formatEther(minExecutorStake)} ETH\
          \n Network:                ${network.name}\n
        `);
      }
      return minExecutorStake;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
