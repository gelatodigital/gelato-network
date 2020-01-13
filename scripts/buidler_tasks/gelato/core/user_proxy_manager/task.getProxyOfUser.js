import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-getproxyofuser",
  `Calls GelatoCore.getProxyOfUser([<user>: defaults to ethers signer]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalPositionalParam(
    "user",
    "The address of the user, whose proxy address we query"
  )
  .setAction(async ({ user, log }) => {
    try {
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });
      let userAddress;
      if (user) userAddress = user;
      else userAddress = await run("ethers", { signer: true, address: true });

      const userProxyAddress = await gelatoCoreContract.getProxyOfUser(
        userAddress
      );
      if (log)
        console.log(
          `\nuserProxyAddress of user: ${userAddress}:\n${userProxyAddress}\n`
        );
      return userProxyAddress;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
