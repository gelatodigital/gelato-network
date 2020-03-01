import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-withdrawproviderrbalance",
  `Sends tx to GelatoCore.withdrawProviderBalance([<amount>]) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("amount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, log }) => {
    try {
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const tx = await gelatoCoreContract.withdrawProviderBalance(amount);
      if (log) console.log(`\n\ntxHash withdrawProviderBalance: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
