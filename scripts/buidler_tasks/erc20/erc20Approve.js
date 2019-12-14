import { Contract } from "ethers";

export default async (taskArgs, ethers) => {
  try {
    const [signer] = await ethers.signers();
    const ierc20ABI = [
      "function approve(address spender, uint256 amount) external returns (bool)"
    ];
    const erc20Contract = new Contract(taskArgs.erc20, ierc20ABI, signer);
    const tx = await erc20Contract.approve(taskArgs.spender, taskArgs.amount);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
