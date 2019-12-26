import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gelato-core-create-user-proxy",
  `Sends tx to GelatoCore.createUserProxy() on [--network] (default: ${defaultNetwork})`
).setAction(async () => {
  try {
    const [signer] = await ethers.signers();
    const breConfigObj = {deployments:true, cp}
    const gelatoCoreAdddress = await run("bre-config", {contractname })
    const gelatoCoreABI = [
      "function createUserProxy() external returns(address)"
    ];
    const gelatoCoreContract = new Contract(erc20address, gelatoCoreABI, signer);
    const tx = await gelatoCoreContract.approve(spender, amount);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
