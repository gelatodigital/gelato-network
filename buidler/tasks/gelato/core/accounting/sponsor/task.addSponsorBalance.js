import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-addsponsorbalance",
  `Sends tx to GelatoCore.addSponsorBalance(<) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("amount", "The amount to add to the sponsor's balance")
  .addOptionalPositionalParam(
    "sponsor",
    "The sponsor to add balance to."
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, sponsor, log }) => {
    try {
      if (!sponsor) {
        sponsor = await run("bre-config", {
          addressbookcategory: "sponsor",
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
      const tx = await gelatoCoreContract.addSponsorBalance(amount);
      if (log) console.log(`\n\ntxHash addsponsorbalance: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
