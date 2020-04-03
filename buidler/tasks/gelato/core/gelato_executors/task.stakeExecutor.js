import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

const SIXY_DAYS = 5184000;

export default task(
  "gc-stakeExecutor",
  `Sends tx to GelatoCore.stakeExecutor([<_executorClaimLifespan>, <executorSuccessShare>]) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "execclaimtenancy",
    "gelatoExecutor's max execClaim lifespan",
    SIXY_DAYS,
    types.int
  )
  .addOptionalPositionalParam(
    "executorsuccessfeefactor",
    "The percantage cut of total execution costs that the gelatoExecutor takes as profit.",
    5,
    types.int
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
  .setAction(async taskArgs => {
    try {
      // We use the 2nd account (index 1) generated from mnemonic for the gelatoExecutor by default
      const {
        [taskArgs.executorindex]: gelatoExecutor
      } = await ethers.signers();

      if (!gelatoExecutor)
        throw new Error("\n Executor accounts from ethers.signers failed \n");

      if (taskArgs.log) console.log("gc-stakeExecutor:\n", taskArgs);

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        signer: gelatoExecutor,
        write: true
      });

      const tx = await gelatoCore.stakeExecutor(
        taskArgs.execclaimtenancy,
        taskArgs.executorsuccessfeefactor
      );

      if (taskArgs.log) console.log(`\n\ntxHash stakeExecutor: ${tx.hash}`);

      const { blockHash: blockhash } = await tx.wait();

      if (taskArgs.events) {
        await run("event-getparsedlogsallevents", {
          contractname: "GelatoCore",
          contractaddress: gelatoCore.address,
          blockhash,
          txhash: tx.hash,
          values: true,
          stringify: true,
          log: true
        });
      }

      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
