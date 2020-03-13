import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptEnterPortfolioRebalancing",
  `Returns a hardcoded payload for ScriptEnterPortfolioRebalancing`
)
  .addOptionalParam("executorindex", "mnemoric index of executor", 0, types.int)
  .addOptionalParam("providerindex", "mnemoric index of provider", 0, types.int)
  .addFlag("log")
  .setAction(async ({ log, providerindex, executorindex }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const signers = await ethers.signers();
      const executor = signers[parseInt(executorindex)]._address;
      const provider = signers[parseInt(providerindex)]._address;

      const inputs = [gelatoCore.address, [provider, executor]];

      const payload = await run("abi-encode-withselector", {
        contractname: "ScriptEnterPortfolioRebalancing",
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
