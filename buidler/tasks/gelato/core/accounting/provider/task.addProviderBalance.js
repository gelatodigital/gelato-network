import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-addproviderbalance",
  `Sends tx to GelatoCore.addProviderBalance(<) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("amount", "The amount to add to the provider's balance")
  .addOptionalPositionalParam(
    "provider",
    "The provider to add balance to."
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, provider, log }) => {
    try {
      if (!provider) {
        provider = await run("bre-config", {
          addressbookcategory: "provider",
          addressbookentry: "default"
        });
      }
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
      const tx = await gelatoCoreContract.addProviderBalance(amount);
      if (log) console.log(`\n\ntxHash addproviderbalance: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
