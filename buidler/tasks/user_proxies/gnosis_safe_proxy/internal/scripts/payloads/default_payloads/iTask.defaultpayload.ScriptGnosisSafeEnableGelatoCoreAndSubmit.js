import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptGnosisSafeEnableGelatoCoreAndSubmit",
  `Returns a hardcoded payload for the 'data' field of the initializer payload`
)
  .addPositionalParam("conditionname")
  .addPositionalParam("actionname")
  .addOptionalPositionalParam(
    "taskreceiptexpirydate",
    "Defaults to 0 for selected gelatoExecutor's maximum",
    0,
    types.int
  )
  .addFlag("log")
  .setAction(
    async ({ conditionname, actionname, taskreceiptexpirydate, log }) => {
      try {
        const gelatoProvider = await run("bre-config", {
          addressbookcategory: "gelatoProvider",
          addressbookentry: "default"
        });
        const gelatoExecutor = await run("bre-config", {
          addressbookcategory: "gelatoExecutor",
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
        const conditionData = await run(
          "gc-submittask:defaultpayload:ConditionTime"
        );
        const actionData = await run(
          "gc-submittask:defaultpayload:ActionERC20TransferFrom"
        );
        const payload = await run("abi-encode-withselector", {
          contractname: "ScriptGnosisSafeEnableGelatoCoreAndSubmit",
          functionname: "enableModuleAndSubmit",
          inputs: [
            gelatoCore.address,
            [gelatoProvider, gelatoExecutor],
            [conditionAddress, actionAddress],
            conditionData,
            actionData,
            taskreceiptexpirydate
          ]
        });
        if (log) {
          console.log(
            `\n Payload for ScriptGnosisSafeEnableGelatoCoreAndSubmit\
             \n GelatoCore: ${gelatoCore.address}\
             \n Provider:   ${gelatoProvider}\
             \n Executor    ${gelatoExecutor}\
             \n Condition:  ${conditionname} at ${conditionAddress}\
             \n Action:     ${actionname} at ${actionAddress}\
             \n ExpiryDate: ${taskreceiptexpirydate}\
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
