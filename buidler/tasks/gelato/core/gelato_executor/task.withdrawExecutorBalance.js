import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-withdrawexecutorbalance",
  `Sends tx to GelatoCore.withdrawExecutorBalance() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("amount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, log }) => {
    try {
      // We use the 2nd account generated from mnemonic for the executor
      const { 1: executor } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: executor,
        write: true
      });
      if (!amount) amount = await gelatoCore.executorBalance(executor._address);
      const tx = await gelatoCore.withdrawExecutorBalance(amount);
      if (log) console.log(`\n\ntxHash withdrawExecutorBalance: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
