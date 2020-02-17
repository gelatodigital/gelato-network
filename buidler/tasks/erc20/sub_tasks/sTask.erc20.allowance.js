import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { Contract } from "ethers";

export default internalTask(
  "erc20:allowance",
  `Return <spender>'s <erc20> allowance from <owner> on [--network] (default: ${defaultNetwork})`
)
  .addParam("erc20address")
  .addParam("owner", "address")
  .addParam("spender", "address")
  .setAction(async ({ erc20address, owner, spender }) => {
    try {
      const [signer] = await ethers.signers();
      const ierc20ABI = [
        "function allowance(address owner, address spender) external view returns (uint256)"
      ];
      const erc20Contract = new Contract(erc20address, ierc20ABI, signer);
      const allowance = await erc20Contract.allowance(owner, spender);
      return allowance;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
