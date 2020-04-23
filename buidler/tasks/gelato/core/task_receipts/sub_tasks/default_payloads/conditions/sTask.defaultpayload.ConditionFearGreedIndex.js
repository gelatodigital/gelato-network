import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
	"gc-submittask:defaultpayload:ConditionFearGreedIndex",
	`Returns a hardcoded conditionData of ConditionFearGreedIndex`
)
	.addFlag("log")
	.setAction(async ({ log }) => {
		let [signer] = await ethers.getSigners();

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
			const conditionData = await run("abi-encode-withselector", {
				contractname: "ConditionFearGreedIndex",
				functionname: "ok",
				inputs: [currentFearGreedIndex]
			});
			if (log) console.log(conditionData);
			return conditionData;
		} catch (err) {
			console.error(err);
			process.exit(1);
		}
	});
