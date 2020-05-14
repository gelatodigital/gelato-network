import { task } from "@nomiclabs/buidler/config";

export default task(
  "gelato-check-if-provider-liquid",
  `Checks if task spec is whitelisted by given provider on gelato core`
)
  .addOptionalParam(
    "provider",
    "address of provider who should have provided the task spec"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.provider) {
        const provider = getProvider();
        taskArgs.provider = await provider.getAddress();
      }
      const gelatoCore = await run("instantiateContract", {
        deployments: true,
        contractname: "GelatoCore",
        read: true,
      });

      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      const gelatoGasPrice = await run("fetchGelatoGasPrice");

      // Check if taskSpecHash's gasPriceCeil is != 0
      const isProviderLiquid = await gelatoCore.isProviderLiquid(
        taskArgs.provider,
        gelatoMaxGas,
        gelatoGasPrice
      );

      // Revert if task spec is not provided

      console.log(
        `
          \nProvider: ${taskArgs.provider}
          \nProvider is ${
            isProviderLiquid
              ? "Sufficiently funded ✅"
              : "Insufficiently funded❌"
          }
          \n${
            isProviderLiquid
              ? ""
              : "To fund your provider, run: >> npx buidler gelato-providefunds 1 --network networkName"
          }\n`
      );

      return isProviderLiquid;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
