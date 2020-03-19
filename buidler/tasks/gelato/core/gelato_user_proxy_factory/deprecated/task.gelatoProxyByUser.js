import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-gelatoproxybyuser",
  `Calls GelatoCore.gelatoProxyByUser([<user>: defaults to ethers signer]) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "user",
    "The address of the user, whose proxy address we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ user, log }) => {
    try {
      if (!user) user = await run("ethers", { signer: true, address: true });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });
      const gelatoUserProxyAddress = await gelatoCore.gelatoProxyByUser(user);
      if (log) {
        console.log(
          `\n User:            ${user}\
           \n GelatoUserProxy: ${gelatoUserProxyAddress}\n`
        );
      }
      return gelatoUserProxyAddress;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
