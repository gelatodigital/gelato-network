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
			if (log) console.log(`\n${action}\n`);

			const provider = await ethers.getDefaultProvider();
			const preBalance = await provider.getBalance(action.address);

			if (log) console.log(`\nPre Balance: ${preBalance}\n`);

			// const tx = await action.action();
			// if (log) console.log(`\ntxHash set: ${tx.hash}\n`);
			// await tx.wait();
			// return tx.hash;
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	});
