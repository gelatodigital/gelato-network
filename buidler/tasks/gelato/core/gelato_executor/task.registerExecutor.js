import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

const date = Date.now();
// Default to 3 months from now
const expirationDateDefault = new Date(
  date.getFullYear(),
  date.getMonth() + 3,
  date.getDate()
);

export default task(
  "gc-registerexecutor",
  `Sends tx to GelatoCore.registerExecutor([<_executorClaimLifespan>]) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "executorclaimlifespan",
    "executor's max executionClaim lifespan",
    expirationDateDefault,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ executorclaimlifespan, log }) => {
    try {
      // We use the 2nd account generated from mnemonic for the executor
      const [, signer2, ...rest] = await ethers.signers();
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: signer2
      });
      const tx = await gelatoCoreContract.registerExecutor(
        executorclaimlifespan
      );
      if (log) console.log(`\n\ntxHash registerExecutor: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
