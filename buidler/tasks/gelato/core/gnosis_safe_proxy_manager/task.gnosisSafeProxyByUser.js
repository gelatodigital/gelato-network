import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-gnosissafeproxybyuser",
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

      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const gnosisSafeProxyAddress = await gelatoCoreContract.gelatoProxyByUser(
        user
      );
      if (log) {
        console.log(
          `\n User:            ${user}\
           \n GnosisSafeProxy: ${gnosisSafeProxyAddress}\n`
        );
      }
      return gnosisSafeProxyAddress;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
