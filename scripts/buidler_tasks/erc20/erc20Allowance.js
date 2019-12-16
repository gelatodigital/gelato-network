import { Contract } from "ethers";

export default async taskArgs => {
  try {
    const [signer] = await ethers.signers();
    const ierc20ABI = [
      "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    const erc20Contract = new Contract(
      taskArgs.erc20Address,
      ierc20ABI,
      signer
    );
    const allowance = await erc20Contract.allowance(
      taskArgs.owner,
      taskArgs.spender
    );
    return allowance;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
