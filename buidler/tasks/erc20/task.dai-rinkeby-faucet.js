import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "get-dai",
  `Return (or --log) <erc20address> allowance by <owner> to <spender> on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    const user = getUser();
    const userAddress = await user.getAddress();
    const daiAbi = [
      "function allocateTo(address _userAddress, uint256 _amount)",
    ];

    const dai = await ethers.getContractAt(
      daiAbi,
      "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa"
    );
    console.log(dai);
    console.log("to here");
    const tx = await dai.allocateTo(
      userAddress,
      1 // ethers.utils.parseUnits("100", 18)
    );
    console.log("bug");
    console.log(`\napprove-txHash: ${tx.hash}\n`);
    await tx.wait();
    return tx.hash;
  });
