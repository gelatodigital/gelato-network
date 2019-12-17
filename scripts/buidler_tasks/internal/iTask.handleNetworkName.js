import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default internalTask(
  "handleNetworkName",
  `Throws if networkname is invalid OR returns the Default Network (${defaultNetwork}) if networkname is undefined`
)
  .addParam("networkname")
  .setAction(async ({ networkname }) => {
    try {
      if (networkname) await run("checkNetworkName", { networkname });
      else networkname = defaultNetwork;
      return networkname;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
