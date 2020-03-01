import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gc-withdrawexecutorbalance",
  `Sends tx to GelatoCore.withdrawExecutorBalance() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("amount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, log }) => {
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
      const tx = await gelatoCoreContract.withdrawExecutorBalance(amount);
      if (log) console.log(`\n\ntxHash withdrawExecutorBalance: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
