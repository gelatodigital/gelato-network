import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "unstakeExecutor",
  `Sends tx to gelatoCore.unstakeExecutor() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam("gelatocore", "address of gelatocore")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gelatocore, log }) => {
    try {
      // We use the 2nd account (index 1) generated from mnemonic for the gelatoExecutor by default
      const executorWallet = await getExecutor();
      if (log) {
        console.log(`\n Unstaking to ${await executorWallet.getAddress()}\n`);
      }
      const gelatoCore = await ethers.getContractAt(
        "GelatoCore",
        gelatocore ? gelatocore : network.config.deployments.GelatoCore
      );

      const providerCount = await gelatoCore.executorProvidersCount(
        await executorWallet.getAddress()
      );

      const canUnstake = providerCount.toString() === "0" ? true : false;

      let tx;
      if (canUnstake) {
        tx = await gelatoCore.unstakeExecutor();
        if (log) console.log(`\n\ntxHash unstakeExecutor: ${tx.hash}`);
        await tx.wait();
        return tx.hash;
      } else {
        if (log) {
          console.log(`\n\n ❌ executor cannot unstake!`);
          console.log(`\n\n providerCount: ${providerCount}`);
        }
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
