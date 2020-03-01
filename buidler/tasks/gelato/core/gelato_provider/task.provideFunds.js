import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-providefunds",
  `Sends tx to GelatoCore.provideFunds(<) on [--network] (default: ${defaultNetwork})`
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
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const tx = await gelatoCoreContract.provideFunds(amount);
      if (log) console.log(`\n\ntxHash providefunds: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
