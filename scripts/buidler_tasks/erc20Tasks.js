import { Contract, utils } from "ethers";

export async function erc20Approve(taskArgs, ethers) {
  try {
    const erc20Address = utils.getAddress(taskArgs.erc20);
    const spenderAddress = utils.getAddress(taskArgs.spender);
    const amount = utils.bigNumberify(taskArgs.amount);
    const [signer] = await ethers.signers();
    const ierc20ABI = [
      "function approve(address spender, uint256 amount) external returns (bool)"
    ];
    const erc20Contract = new Contract(erc20Address, ierc20ABI, signer);
    const tx = await erc20Contract.approve(spenderAddress, amount);
    console.log(`\n\t\t erc20:approve txHash:\n\t ${tx.hash}`);
    const txReceipt = await tx.wait();
    console.log(`\t\t Tx mined: ${txReceipt.blockNumber !== undefined}`);
  } catch (error) {
    console.error(error);
  }
}

export async function erc20Allowance(taskArgs, ethers) {
  try {
    const erc20Address = utils.getAddress(taskArgs.erc20);
    const ownerAddress = utils.getAddress(taskArgs.owner);
    const spenderAddress = utils.getAddress(taskArgs.spender);
    const [signer] = await ethers.signers();
    const ierc20ABI = [
      "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    const erc20Contract = new Contract(erc20Address, ierc20ABI, signer);
    const allowance = await erc20Contract.allowance(
      ownerAddress,
      spenderAddress
    );
    console.log(`\n\t\t erc20-allowance: ${allowance}`);
  } catch (error) {
    console.error(error);
  }
}