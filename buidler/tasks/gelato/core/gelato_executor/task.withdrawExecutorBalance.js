import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-withdrawexecutorbalance",
  `Sends tx to GelatoCore.withdrawExecutorBalance() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("amount", "The amount to withdraw")
  .addOptionalParam(
    "executorindex",
    "index of tx Signer account generated from mnemonic available inside BRE",
    1,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, executorindex, log }) => {
    try {
      // We use the 2nd account (index 1) generated from mnemonic for the executor by default
      const { [executorindex]: executor } = await ethers.signers();
      if (log) {
        console.log(
          `\n Taking account with index: ${executorindex}\
		       \n Executor Address: ${executor._address}\n`
        );
      }
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: executor,
        write: true
      });
      if (!amount) amount = await gelatoCore.executorFunds(executor._address);
      const tx = await gelatoCore.withdrawExecutorBalance(amount);
      if (log) console.log(`\n\ntxHash withdrawExecutorBalance: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
