import { internalTask } from "@nomiclabs/buidler/config";
import { AddressZero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

export default internalTask(
	"gc-mint:defaultpayload:ActionChainedRebalancePortfolio",
	`Returns a hardcoded actionPayload of ActionChainedRebalancePortfolio`
)
	.addOptionalPositionalParam(
		"executorindex",
		"which mnemoric index should be selected for executor msg.sender (default index 0)",
		0,
		types.int
	)
	.addOptionalPositionalParam(
		"providerindex",
		"which mnemoric index should be selected for provider (default index 0)",
		0,
		types.int
	)
	.addFlag("log")
	.setAction(async ({ executorindex = 0, providerindex = 0, log = true }) => {
		try {
			const signers = await ethers.signers();
			const executor = signers[parseInt(executorindex)];
			const provider = signers[parseInt(providerindex)];
			const providerAndExecutor = [provider._address, executor._address];

			const actionPayload = await run("abi-encode-withselector", {
				contractname: "ActionChainedRebalancePortfolio",
				functionname: "chainedAction",
				inputs: [providerAndExecutor],
				log
			});

			if (log) console.log(actionPayload);
			return actionPayload;
		} catch (err) {
			console.error(err);
			process.exit(1);
		}
	});
