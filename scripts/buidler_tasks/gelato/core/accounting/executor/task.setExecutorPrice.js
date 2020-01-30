import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-setexecutorprice",
  `Sends tx to GelatoCore.setExecutorPrice(<price>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "price",
    "the executor's price per gas unit of mintingDepositPayable"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ price, log }) => {
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
      const tx = await gelatoCoreContract.setExecutorPrice(price);
      if (log) console.log(`\n\ntxHash setExecutorPrice: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
