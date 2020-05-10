import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";

export default internalTask(
  "handleNetworkName",
  `Throws if networkname is invalid OR returns the connected [--network] (default: ${defaultNetwork}), if networkname is undefined`
)
  .addOptionalParam("networkname")
  .setAction(async ({ networkname }) => {
    try {
      if (networkname) await run("checkNetworkName", { networkname });
      else networkname = network.name;
      return networkname;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
