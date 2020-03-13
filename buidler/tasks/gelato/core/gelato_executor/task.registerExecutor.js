import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

const SIXY_DAYS = 5184000;

export default task(
  "gc-registerexecutor",
  `Sends tx to GelatoCore.registerExecutor([<_executorClaimLifespan>]) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "executorclaimlifespan",
    "executor's max executionClaim lifespan",
    SIXY_DAYS,
    types.int
  )
  .addOptionalParam(
    "executorindex",
    "index of tx Signer account generated from mnemonic available inside BRE",
    1,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ executorclaimlifespan, executorindex, log }) => {
    try {
      // We use the 2nd account (index 1) generated from mnemonic for the executor by default
      const { [executorindex]: executor } = await ethers.signers();
      if (log) {
        console.log(
          `\n Taking account with index: ${executorindex}\
		   \n Executor Address: ${executor._address}\n`
        );
      }
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: executor,
        write: true
      });
      const tx = await gelatoCore.registerExecutor(executorclaimlifespan);
      if (log) console.log(`\n\ntxHash registerExecutor: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
