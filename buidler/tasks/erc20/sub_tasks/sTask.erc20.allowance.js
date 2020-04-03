import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";

export default internalTask(
  "erc20:allowance",
  `Return <spender>'s <erc20> allowance from <owner> on [--network] (default: ${defaultNetwork})`
)
  .addParam("erc20address")
  .addParam("owner", "address")
  .addParam("spender", "address")
  .setAction(async ({ erc20address, owner, spender }) => {
    try {
      const erc20Contract = await run("instantiateContract", {
        contractname: "IERC20",
        contractaddress: erc20address,
        write: true
      });
      const allowance = await erc20Contract.allowance(owner, spender);
      return allowance;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
