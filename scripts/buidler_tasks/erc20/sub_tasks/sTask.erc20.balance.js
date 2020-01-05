import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { Contract } from "ethers";

export default internalTask(
  "erc20:balance",
  `Return <erc20> balance of <owner> on [--network] (default: ${defaultNetwork})`
)
  .addParam("erc20address")
  .addParam("owner", "address")
  .setAction(async ({ erc20address, owner }) => {
    try {
      const [signer] = await ethers.signers();
      const ierc20ABI = [
        "function balanceOf(address account) external view returns (uint256)"
      ];
      const erc20Contract = new Contract(erc20address, ierc20ABI, signer);
      const balance = await erc20Contract.balanceOf(owner);
      return balance;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
