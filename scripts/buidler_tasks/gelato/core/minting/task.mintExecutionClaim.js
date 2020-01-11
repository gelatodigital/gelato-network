import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gelato-core-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("triggername", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addOptionalPositionalParam("triggerpayloadwithselector", "abi.encoded bytes")
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

      // Handle trigger action addresses
      const triggerAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.triggername
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      // Handle trigger payloadsWithSelector
      let triggerPayloadWithSelector;
      if (!taskArgs.triggerpayloadwithselector) {
        triggerPayloadWithSelector = await run(
          `gelato-core-mint:defaultpayload:${taskArgs.triggername}`
        );
      } else {
        triggerPayloadWithSelector = taskArgs.triggerpayloadwithselector;
      }
      // Handle action payloadsWithSelector
      let actionPayloadWithSelector;
      if (!taskArgs.actionpayloadwithselector) {
        actionPayloadWithSelector = await run(
          `gelato-core-mint:defaultpayload:${taskArgs.actionname}`
        );
      } else {
        actionPayloadWithSelector = taskArgs.actionpayloadwithselector;
      }

      // MintingDepositPayable
      const mintingDepositPayable = await run(
        "gelato-core-getmintingdepositpayable",
        {
          selectedexecutor,
          triggername: taskArgs.triggername,
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
        triggerAddress,
        triggerPayloadWithSelector,
        actionAddress,
        actionPayloadWithSelector,
        { value: mintingDepositPayable }
      );

      if (taskArgs.log)
        console.log(
          `\n\ntxHash gelatoCore.mintExectuionClaim: ${mintTx.hash}\n`
        );
      await mintTx.wait();
      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
