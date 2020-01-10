import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "checkNetworkName",
  "Throws if --networkname does not exist inside config.networks"
)
  .addParam("networkname", "Name of network to check")
  .setAction(async ({ networkname }) => {
    try {
      if (!Object.keys(config.networks).includes(networkname))
        throw new Error(
          `networkname: ${networkname} does not exist in config.networks`
        );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
