import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
	"gc-mint:defaultpayload:ConditionFearGreedIndex",
	`Returns a hardcoded conditionPayload of ConditionFearGreedIndex`
)
	.addFlag("log")
	.setAction(async ({ log }) => {
		let [signer] = await ethers.signers();

		// Fetch current fearAndGreedIndex value
		const conditionFearGreedIndex = await run("instantiateContract", {
			contractname: "ConditionFearGreedIndex",
			signer: signer,
			read: true
		});

		const currentFearGreedIndex = await conditionFearGreedIndex.value();

		if (log)
			console.log(`
    \n Current Fear and Greed index: ${currentFearGreedIndex}
    `);

		try {
			const conditionPayload = await run("abi-encode-withselector", {
				contractname: "ConditionFearGreedIndex",
				functionname: "ok",
				inputs: [currentFearGreedIndex]
			});
			if (log) console.log(conditionPayload);
			return conditionPayload;
		} catch (err) {
			console.error(err);
			process.exit(1);
		}
	});
