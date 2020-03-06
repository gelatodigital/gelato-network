import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { ethers } from "ethers";

export default task(
	"ga-rebalanceportfolio-inputEth",
	`Sends 0.1 ETH to ActionRebalancePortfolio.inputEth() on [--network] (default: ${defaultNetwork})`
)
	// .addPositionalParam("newvalue", "Value between 0 and 100", 50, types.int)
	.addFlag("log", "Logs return values to stdout")
	.setAction(async ({ log }) => {
		try {
			const action = await run("instantiateContract", {
				contractname: "ActionRebalancePortfolio",
				write: true
			});

			const halfEth = ethers.utils.parseEther("0.01");

			const tx = await action.inputEth({ value: halfEth });
			if (log) {
				console.log(`\ntxHash set: ${tx.hash}\n`);
				console.log(
					`\nSuccessfully inputted  ${halfEth} into the smart contract\n`
				);
			}
			await tx.wait();
			return tx.hash;
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	});
