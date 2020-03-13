import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptEnableGelatoCoreAndExecuteChainedAction",
  `Returns a hardcoded payload for ScriptEnableGelatoCoreAndExecuteChainedAction`
)
  .addOptionalParam("executorindex", "mnemoric index of executor", 0, types.int)
  .addOptionalParam("providerindex", "mnemoric index of provider", 0, types.int)
  .addFlag("log")
  .setAction(async ({ log, providerindex, executorindex }) => {
    try {
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        read: true
      });

      const action = await run("instantiateContract", {
        contractname: "ActionChainedRebalancePortfolio",
        read: true
      });

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const signers = await ethers.signers();
      const executor = signers[parseInt(executorindex)]._address;
      const provider = signers[parseInt(providerindex)]._address;

      const inputs = [
        gelatoCore.address,
        [provider, executor],
        [condition.address, action.address]
      ];

      const payload = await run("abi-encode-withselector", {
        contractname: "ScriptEnableGelatoCoreAndExecuteChainedAction",
        functionname: "enableModuleAndExecuteChainedAction",
        inputs
      });

      if (log) console.log(payload);
      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
