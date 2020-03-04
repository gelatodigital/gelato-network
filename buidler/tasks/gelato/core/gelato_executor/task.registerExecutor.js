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
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ executorclaimlifespan, log }) => {
    try {
      // We use the 2nd account generated from mnemonic for the executor
      const { 1: executor } = await ethers.signers();
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
