import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-withdrawexecutorbalance",
  `Sends tx to GelatoCore.withdrawExecutorBalance() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("amount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, log }) => {
    try {
      // We use the 2nd account generated from mnemonic for the executor
      const [, signer2, ...rest] = await ethers.signers();
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: signer2
      });
      const tx = await gelatoCoreContract.withdrawExecutorBalance(amount);
      if (log) console.log(`\n\ntxHash withdrawExecutorBalance: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
