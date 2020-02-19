import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-withdrawsponsorrbalance",
  `Sends tx to GelatoCore.withdrawSponsorBalance([<amount>]) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("amount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, log }) => {
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

      const tx = await gelatoCoreContract.withdrawSponsorBalance(amount);

      if (log) console.log(`\n\ntxHash withdrawSponsorBalance: ${tx.hash}`);

      await tx.wait();

      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
