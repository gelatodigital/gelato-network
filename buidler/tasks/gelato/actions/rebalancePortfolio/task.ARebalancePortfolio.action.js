import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { ethers } from "ethers";

export default task(
	"ga-rebalanceportfolio-action",
	`Sends tx to ActionRebalancePortfolio.action() on [--network] (default: ${defaultNetwork})`
)
	// .addPositionalParam("newvalue", "Value between 0 and 100", 50, types.int)
	.addFlag("log", "Logs return values to stdout")
	.setAction(async ({ log }) => {
		try {
			const action = await run("instantiateContract", {
				contractname: "ActionRebalancePortfolio",
				write: true
			});

			const provider = await ethers.getDefaultProvider("kovan");
			const preBalance = await provider.getBalance(action.address);

			// Get  ETH and DAI balances before

			const daiAddress = "0xC4375B7De8af5a38a93548eb8453a498222C4fF2";
			const erc20Abi = [
				"function balanceOf(address account) external view returns (uint256)"
			];

			const daiContract = new ethers.Contract(daiAddress, erc20Abi, provider);
			console.log("1");
			const preDaiBalance = await daiContract.balanceOf(action.address);
			if (log) {
				console.log(`ETH & DAI Balances before`);
				console.log(`ETH Balance: ${preBalance}`);
				console.log(`DAI Balance: ${preDaiBalance}`);
			}

			// Instantiate Uniswap Kovan
			const uniswapFactoryAddress =
				"0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30";
			const uniswapFactoryAbi = [
				"function getExchange(address token) external view returns (address)"
			];

			const uniswapFactoryContract = new ethers.Contract(
				uniswapFactoryAddress,
				uniswapFactoryAbi,
				provider
			);
			const uniswapDaiExchangeAddress = await uniswapFactoryContract.getExchange(
				daiAddress
			);
			const uniswapExchangeAbi = [
				"getEthToTokenInputPrice(uint256 ethSold) external view returns (uint256 tokensBought)"
			];

			const uniswapExchangeContract = new ethers.Contract(
				uniswapDaiExchangeAddress,
				uniswapExchangeAbi,
				provider
			);

			const preContractEthValueInDai = await uniswapExchangeContract.getEthToTokenInputPrice(
				preBalance
			);

			const preTotalDaiBalance =
				parseFloat(preContractEthValueInDai) + parseFloat(preDaiBalance);

			const preEthWeight =
				parseFloat(preContractEthValueInDai) / parseFloat(preTotalDaiBalance);

			const preDaiWeight =
				parseFloat(preDaiBalance) / parseFloat(preTotalDaiBalance);

			if (preDaiWeight > parseFloat(0.8)) {
				console.log(
					`DAI that should be sold: ${parseFloat(preDaiBalance) -
						parseFloat(0.8) * preTotalDaiBalance}`
				);
			} else {
				console.log(
					`ETH that should be sold: ${parseFloat(preContractEthValueInDai) -
						parseFloat(0.2) * preTotalDaiBalance}`
				);
			}

			if (log) {
				console.log(
					`\nETH Contract Balance value in DAI ${preContractEthValueInDai}\n`
				);
				console.log(`\Total Contract Balance in DAI ${preTotalDaiBalance}\n`);
				console.log(`\ETH Portfolio Weight ${preEthWeight}\n`);
				console.log(`\DAI Portfolio Weight ${preDaiWeight}\n`);
			}

			const tx = await action.action({ gasLimit: 1000000 });
			if (log) console.log(`\ntxHash set: ${tx.hash}\n`);
			await tx.wait();
			console.log("Action Success");

			const postBalance = await provider.getBalance(action.address);
			const postDaiBalance = await daiContract.balanceOf(action.address);
			if (log) {
				console.log(`ETH & DAI Balances after`);
				console.log(`ETH Balance: ${postBalance}`);
				console.log(`DAI Balance: ${postDaiBalance}`);
			}

			const postContractEthValueInDai = await uniswapExchangeContract.getEthToTokenInputPrice(
				postBalance
			);

			const postTotalDaiBalance =
				parseFloat(postContractEthValueInDai) + parseFloat(postDaiBalance);

			const postEthWeight =
				parseFloat(postContractEthValueInDai) / parseFloat(postTotalDaiBalance);

			const postDaiWeight =
				parseFloat(postDaiBalance) / parseFloat(postTotalDaiBalance);

			if (log) {
				console.log(
					`\nETH Contract Balance value in DAI ${postContractEthValueInDai}\n`
				);
				console.log(`\Total Contract Balance in DAI ${postTotalDaiBalance}\n`);
				console.log(`\ETH Portfolio Weight ${postEthWeight}\n`);
				console.log(`\DAI Portfolio Weight ${postDaiWeight}\n`);
				console.log(
					`\n DAI sold: ${parseFloat(preDaiBalance) -
						parseFloat(postDaiBalance)}\n`
				);
			}
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	});
