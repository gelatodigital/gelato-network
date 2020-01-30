import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { Contract } from "ethers";

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
      const [signer1, signer2, ...rest] = await ethers.signers();
      const gelatoCoreAdddress = await run("bre-config", {
        deployments: true,
        contractname: "GelatoCore"
      });
      const gelatoCoreAbi = await run("abi-get", {
        contractname: "GelatoCore"
      });
      const gelatoCoreContract = new Contract(
        gelatoCoreAdddress,
        gelatoCoreAbi,
        signer2
      );
      const tx = await gelatoCoreContract.setExecutorClaimLifespan(lifespan);
      if (log) console.log(`\n\ntxHash setExecutorClaimLifespan: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
