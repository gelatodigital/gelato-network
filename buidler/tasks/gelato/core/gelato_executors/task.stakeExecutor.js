import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-stakeexecutor",
  `Sends tx to GelatoCore.stakeExecutor{msg.value}() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "stake",
    "The amount to stake. Defaults to gelatoCore.minExecutorStake()"
  )
  .addOptionalParam(
    "executorindex",
    "index of tx Signer account generated from mnemonic available inside BRE",
    1,
    types.int
  )
  .addOptionalParam("gelatocoreaddress")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      // We use the 2nd account (index 1) generated from mnemonic for the gelatoExecutor by default
      const {
        [taskArgs.executorindex]: gelatoExecutor,
      } = await ethers.getSigners();

      if (!gelatoExecutor)
        throw new Error("\n gelatoExecutor not instantiated \n");

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        signer: gelatoExecutor,
        write: true,
      });

      if (!taskArgs.stake) taskArgs.stake = await gelatoCore.minExecutorStake();

      if (taskArgs.log) console.log("\n gc-stakeexecutor:\n", taskArgs);

      const tx = await gelatoCore.stakeExecutor({ value: taskArgs.stake });

      if (taskArgs.log) console.log(`\n txHash stakeExecutor: ${tx.hash} \n`);

      const { blockHash: blockhash } = await tx.wait();

      if (taskArgs.events) {
        await run("event-getparsedlogsallevents", {
          contractname: "GelatoCore",
          contractaddress: gelatoCore.address,
          blockhash,
          txhash: tx.hash,
          log: true,
        });
      }

      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
