import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-setadmingasprice",
  `Sends tx to GelatoCore.setAdminGasPrice(<lifespan>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gasprice",
    "The new gasPrice which is used to settle payments between providers and executors"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gasprice, log }) => {
    try {
      const [signer] = await ethers.signers();
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
        signer
      );
      const tx = await gelatoCoreContract.setAdminGasPrice(gasprice);
      if (log) console.log(`\n\ntxHash setAdminGasPrice: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
