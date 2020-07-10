import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "multiReassignProviders",
  `Sends tx to gelatoCore.multiReassignProviders() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("newExecutor", "The executor/module to assign to.")
  .addVariadicPositionalParam("providers", "The providers to reassign from.")
  .addOptionalParam("gelatocore", "address of gelatoCore")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ newExecutor, providers, gelatocore, log }) => {
    try {
      const executorWallet = await getExecutor();
      if (log) {
        console.log(`\n Executor: ${await executorWallet.getAddress()}\n`);
        console.log(`\n Assigning from Providers:\n ${providers}`);
        console.log(`\n Assigning to Executor: ${newExecutor}\n`);
      }
      const gelatoCore = await ethers.getContractAt(
        "GelatoCore",
        gelatocore ? gelatocore : network.config.deployments.GelatoCore
      );

      const tx = await gelatoCore.multiReassignProviders(
        providers,
        newExecutor
      );
      if (log) console.log(`\n\ntxHash multiReassignProviders: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
