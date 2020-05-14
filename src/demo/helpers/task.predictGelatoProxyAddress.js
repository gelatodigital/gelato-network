import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gelato-predict-gelato-proxy-address",
  `Determines gnosis safe proxy address from cpk factory on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "useraddress",
    "address of EOA whose proxy to derive"
  )
  .addOptionalParam(
    "saltnonce",
    "saltnonce that takes part in deriving the address - default to global CPK nonce",
    "42069",
    types.string
  )

  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ useraddress, saltnonce, log }) => {
    try {
      if (!useraddress) {
        const signer = getUser();
        useraddress = await signer.getAddress();
      }

      const proxyFactoryContract = await run("instantiateContract", {
        contractname: "GelatoUserProxyFactory",
        deployments: true,
        read: true,
      });

      const userProxyAddress = await proxyFactoryContract.predictProxyAddress(
        useraddress,
        saltnonce
      );

      console.log(`\nProxy Address: ${userProxyAddress}\n`);

      return userProxyAddress;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
