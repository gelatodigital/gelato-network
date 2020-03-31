import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-setexecutorclaimlifespan",
  `Sends tx to GelatoCore.setExecutorClaimLifespan(<lifespan>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "lifespan",
    "the gelatoExecutor's lifespan limit on execution claims minted for them"
  )
  .addOptionalParam(
    "executorindex",
    "index of tx Signer account generated from mnemonic available inside BRE",
    1,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ lifespan, executorindex, log }) => {
    try {
      // We use the 2nd account (index 1) generated from mnemonic for the gelatoExecutor by default
      const { [executorindex]: gelatoExecutor } = await ethers.signers();
      if (log) {
        console.log(`
          \n Taking account with index: ${executorindex}\
          \n Executor Address: ${gelatoExecutor._address}\n
        `);
      }
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoExecutor,
        write: true
      });
      const tx = await gelatoCore.setExecutorClaimLifespan(lifespan);
      if (log) console.log(`\n\ntxHash setExecutorClaimLifespan: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
