import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gelato-core-getproxyofuser",
  `Calls GelatoCore.getProxyOfUser([--user: defaults to ethers signer]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalParam(
    "user",
    "The address of the user, whose proxy address we query"
  )
  .setAction(async ({ log, user }) => {
    try {
      // To avoid mistakes default log to true
      log = true;
      const [signer] = await ethers.signers();
      const gelatoCoreAdddress = await run("bre-config", {
        deployments: true,
        contractname: "GelatoCore"
      });
      const gelatoCoreABI = [
        "function getProxyOfUser(address _user) external view returns(address)"
      ];
      const gelatoCoreContract = new Contract(
        gelatoCoreAdddress,
        gelatoCoreABI,
        signer
      );
      let userAddress;
      if (user) userAddress = user;
      else userAddress = signer._address;

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
