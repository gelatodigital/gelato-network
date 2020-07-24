import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-internalGasRequirement",
  `Return (or --log) GelatoCore.internalGasRequirement() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const internalGasRequirement = await gelatoCore.internalGasRequirement();
      if (log) {
        console.log(`\n internalGasRequirement: ${internalGasRequirement}`);
      }
      return internalGasRequirement;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
