import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-setexecutorclaimlifespan",
  `Sends tx to GelatoCore.setExecutorClaimLifespan(<lifespan>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "lifespan",
    "the executor's lifespan limit on execution claims minted for them"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ lifespan, log }) => {
    try {
      // We use the 2nd account generated from mnemonic for the executor
      const { 1: signer2 } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: signer2
      });
      const tx = await gelatoCore.setExecutorClaimLifespan(lifespan);
      if (log) console.log(`\n\ntxHash setExecutorClaimLifespan: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
