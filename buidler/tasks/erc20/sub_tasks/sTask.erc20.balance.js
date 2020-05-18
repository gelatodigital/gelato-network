import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";

export default internalTask(
  "erc20:balance",
  `Return <erc20> balance of <owner> on [--network] (default: ${defaultNetwork})`
)
  .addParam("erc20address")
  .addParam("owner", "address")
  .setAction(async ({ erc20address, owner }) => {
    try {
      const erc20Contract = await run("instantiateContract", {
        contractname: "IERC20",
        contractaddress: erc20address
      });
      const balance = await erc20Contract.balanceOf(owner);
      return balance;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
