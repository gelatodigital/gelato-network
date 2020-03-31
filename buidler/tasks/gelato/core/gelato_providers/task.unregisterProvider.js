import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-unregisterprovider",
  `Sends tx to GelatoCore.unregisterProvider(conditions, actions) on [--network] (default: ${defaultNetwork})`
)
  .addVariadicPositionalParam(
    "conditionsandactions",
    "An array of all the conditions and actions to register"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ conditionsandactions, log }) => {
    try {
      // Sanitize Conditions and Actions into address[]
      const conditions = conditionsandactions.filter(contract =>
        contract.startsWith("Condition")
      );
      const actions = conditionsandactions.filter(contract =>
        contract.startsWith("Action")
      );
      const conditionAddresses = await Promise.all(
        conditions.map(async condition => {
          return await run("bre-config", {
            deployments: true,
            contractname: condition
          });
        })
      );
      const actionAddresses = await Promise.all(
        actions.map(async action => {
          return await run("bre-config", {
            deployments: true,
            contractname: action
          });
        })
      );
      // Gelato Provider is the 3rd signer account
      const { 2: gelatoProvider } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoProvider,
        write: true
      });
      // GelatoCore contract call from provider account
      const tx = await gelatoCore.unregisterProvider(
        conditionAddresses,
        actionAddresses,
        {
          gasLimit: 2000000
        }
      );
      if (log) console.log(`\n\ntxHash unregisterProvider: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
