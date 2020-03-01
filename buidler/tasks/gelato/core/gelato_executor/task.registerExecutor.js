import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-registerexecutor",
  `Sends tx to GelatoCore.registerExecutor([<_executorClaimLifespan>]) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "executorclaimlifespan",
    "executor's max executionClaim lifespan",
    21600000,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ executorclaimlifespan, log }) => {
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
