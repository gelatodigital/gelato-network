import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptGnosisSafeEnableGelatoCoreAndMint",
  `Returns a hardcoded payload for the 'data' field of the initializer payload`
)
  .addPositionalParam("conditionname")
  .addPositionalParam("actionname")
  .addOptionalPositionalParam(
    "executionclaimexpirydate",
    "Defaults to 0 for selected executor's maximum",
    0,
    types.int
  )
  .addFlag("log")
  .setAction(
    async ({ conditionname, actionname, executionclaimexpirydate, log }) => {
      try {
        const gelatoProvider = await run("bre-config", {
          addressbookcategory: "provider",
          addressbookentry: "default"
        });
        const gelatoExecutor = await run("bre-config", {
          addressbookcategory: "executor",
          addressbookentry: "default"
        });
        const conditionAddress = await run("bre-config", {
          deployments: true,
          contractname: conditionname
        });
        const actionAddress = await run("bre-config", {
          deployments: true,
          contractname: actionname
        });
        const conditionPayload = await run(
          "gc-mint:defaultpayload:ConditionTimestampPassed"
        );
        const actionPayload = await run(
          "gc-mint:defaultpayload:ActionERC20TransferFrom"
        );
        const payload = await run("abi-encode-withselector", {
          contractname: "ScriptGnosisSafeEnableGelatoCoreAndMint",
          functionname: "enableModuleAndMint",
          inputs: [
            gelatoCore.address,
            [gelatoProvider, gelatoExecutor],
            [conditionAddress, actionAddress],
            conditionPayload,
            actionPayload,
            executionclaimexpirydate
          ]
        });
        if (log) {
          console.log(
            `\n Payload for ScriptGnosisSafeEnableGelatoCoreAndMint\
             \n GelatoCore: ${gelatoCore.address}\
             \n Provider:   ${gelatoProvider}\
             \n Executor    ${gelatoExecutor}\
             \n Condition:  ${conditionname} at ${conditionAddress}\
             \n Action:     ${actionname} at ${actionAddress}\
             \n ExpiryDate: ${executionclaimexpirydate}\
             \n Payload:\n ${payload}\n`
          );
        }
        return payload;
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    }
  );
