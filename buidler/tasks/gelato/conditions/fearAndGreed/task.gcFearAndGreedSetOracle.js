import { task } from '@nomiclabs/buidler/config';
import { defaultNetwork } from '../../../../../buidler.config';
// import { Contract } from 'ethers';

export default task(
	'gc-feargreedindex-setoracle',
	`Sends tx to ConditionFearGreedIndex.setOracle(<newOracleValue>) on [--network] (default: ${defaultNetwork})`
)
	.addPositionalParam('neworaclevalue', 'the conditions newOracleValue')
	.addFlag('log', 'Logs return values to stdout')
	.setAction(async ({ neworaclevalue, log }) => {
		try {
			const fearGreedContract = await run('instantiateContract', {
				contractname: 'ConditionFearGreedIndex',
				// contractaddress: actionAddress,
				write: true
			});
			// await contract.decodePayload(taskArgs[0]);
			const tx = await fearGreedContract.setOracle(neworaclevalue);
			if (log) console.log(`\n\ntxHash setOracle: ${tx.hash}`);
			await tx.wait();
			return tx.hash;
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	});

/*
      const [signer1, signer2, ...rest] = await ethers.signers();
      const fearGreedIndexAdddress = await run("bre-config", {
        deployments: true,
        contractname: "FearGreedIndex"
      });
      const fearGreedIndexAbi = await run("abi-get", {
        contractname: "FearGreedIndex"
      });
      const gelatoCoreContract = new Contract(
        gelatoCoreAdddress,
        fearGreedIndexAbi,
        signer2
      );

      */
