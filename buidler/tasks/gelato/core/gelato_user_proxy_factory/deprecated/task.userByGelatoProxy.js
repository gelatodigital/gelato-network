import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-userbygelatoproxy",
  `Calls GelatoCore.userByGelatoProxy() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gelatoproxyaddress",
    "The address of the Gnosis Safe Proxy, whose user address we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gelatoproxyaddress, log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });
      const user = await gelatoCore.userByGelatoProxy(gelatoproxyaddress);
      if (log) {
        console.log(
          `\n GelatoUserProxy:     ${gelatoproxyaddress}\
           \n User:                ${user}\n`
        );
      }
      return user;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
