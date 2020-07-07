import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "gelato-check-assigned-executor",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam("gelatocoreaddress", "address of gelato core")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gelatocoreaddress }) => {
    try {
      const provider = getProvider();

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: gelatocoreaddress,
        signer: provider,
        write: true,
      });

      const assignedExecutor = await gelatoCore.executorByProvider(
        await provider.getAddress()
      );

      console.log(`Assigned Executor: \n ${assignedExecutor}\n`);
      return assignedExecutor;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
