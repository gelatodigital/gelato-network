import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-userbygnosissafeproxy",
  `Calls GelatoCore.userByGelatoProxy() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gnosisSafeProxyAddress",
    "The address of the Gnosis Safe Proxy, whose user address we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gnosisSafeProxyAddress, log }) => {
    try {
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const user = await gelatoCoreContract.userByGelatoProxy(
        gnosisSafeProxyAddress
      );
      if (log) {
        console.log(
          `\n GnosisSafeProxy: ${gnosisSafeProxyAddress}\
           \n User:            ${user}\n`
        );
      }
      return user;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
