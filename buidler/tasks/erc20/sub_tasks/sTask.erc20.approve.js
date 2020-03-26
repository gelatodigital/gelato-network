import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { Contract } from "ethers";

export default internalTask(
  "erc20:approve",
  `Approves <spender for <amount> of <erc20> on [--network] (default: ${defaultNetwork})`
)
  .addParam("erc20address")
  .addParam("spender", "address")
  .addParam("amount", "uint")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ erc20address, spender, amount, log }) => {
    try {
      const [signer] = await ethers.signers();
      const ierc20ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)"
      ];
      const erc20Contract = new Contract(erc20address, ierc20ABI, signer);
      const tx = await erc20Contract.approve(spender, amount);
      if (log) console.log(`\napprove-txHash: ${tx.hash}\n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
