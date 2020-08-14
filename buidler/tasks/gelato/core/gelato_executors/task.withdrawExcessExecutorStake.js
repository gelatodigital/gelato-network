//import bre from "@nomiclabs/buidler";
import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-withdrawExcessExecutorStake",
  `Sends tx to gelatoCore.withdrawExcessExecutorStake() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "amount",
    "The amount to withdraw in ETH. Defaults to excess stake."
  )
  .addOptionalParam("gelatocoreaddress", "address of gelato")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ amount, gelatocoreaddress, log }) => {
    try {
      // We use the 2nd account (index 1) generated from mnemonic for the gelatoExecutor by default
      const executorWallet = await getExecutor();

      const gelatoCore = await ethers.getContractAt(
        "GelatoCore",
        gelatocoreaddress
          ? gelatocoreaddress
          : network.config.deployments.GelatoCore,
        executorWallet
      );

      const minExecutorStake = await gelatoCore.minExecutorStake();
      const executorStake = await gelatoCore.executorStake(
        await executorWallet.getAddress()
      );
      const excessStake = executorStake.sub(minExecutorStake);

      if (excessStake.lte("0"))
        throw new Error("withdrawExcessExecutorStake: no excess stake");

      const withdrawAmount = amount
        ? ethers.utils.parseEther(amount)
        : excessStake;

      if (log) {
        console.log(
          `\n Withdrawing ${utils.formatEther(
            withdrawAmount
          )} ETH to ${await executorWallet.getAddress()}\n`
        );
      }

      if (network.name === "mainnet") {
        console.log("❗mainnet action: hit ctrl+c to abort.");
        console.log(
          `gasPrice: ${utils.formatUnits(
            network.config.gasPrice.toString(),
            "gwei"
          )} gwei`
        );
        await sleep(10000);
      }

      const tx = await gelatoCore.withdrawExcessExecutorStake(withdrawAmount);
      if (log)
        console.log(`\n\ntxHash withdrawExcessExecutorStake: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
