import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("provider", "The selected provider")
  .addPositionalParam("conditionname", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addOptionalPositionalParam("conditionpayloadwithselector", "abi.encoded bytes")
  .addOptionalPositionalParam("actionpayloadwithselector", "abi.encoded bytes")
  .addOptionalParam("selectedexecutor", "address")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      // Handle executor
      const selectedexecutor = await run("handleExecutor", {
        selectedexecutor: taskArgs.selectedexecutor
      });

      // Handle condition action addresses
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.conditionname
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      // Handle condition payloadsWithSelector
      let conditionPayloadWithSelector;
      if (!taskArgs.conditionpayloadwithselector) {
        conditionPayloadWithSelector = await run(
          `gc-mint:defaultpayload:${taskArgs.conditionname}`
        );
      } else {
        conditionPayloadWithSelector = taskArgs.conditionpayloadwithselector;
      }
      // Handle action payloadsWithSelector
      let actionPayloadWithSelector;
      if (!taskArgs.actionpayloadwithselector) {
        actionPayloadWithSelector = await run(
          `gc-mint:defaultpayload:${taskArgs.actionname}`
        );
      } else {
        actionPayloadWithSelector = taskArgs.actionpayloadwithselector;
      }

      // MintingDepositPayable
      const mintingDepositPayable = await run(
        "gc-getmintingdepositpayable",
        {
          selectedexecutor,
          conditionname: taskArgs.conditionname,
          actionname: taskArgs.actionname,
          log: taskArgs.log
        }
      );

      // GelatoCore write Instance
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      // mintExecutionClaim TX (payable)
      const mintTx = await gelatoCoreContract.mintExecutionClaim(
        selectedexecutor,
        conditionAddress,
        conditionPayloadWithSelector,
        actionAddress,
        actionPayloadWithSelector,
        { value: mintingDepositPayable }
      );

      if (taskArgs.log)
        console.log(
          `\n\ntxHash gelatoCore.mintExecutionClaim: ${mintTx.hash}\n`
        );
      await mintTx.wait();
      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
