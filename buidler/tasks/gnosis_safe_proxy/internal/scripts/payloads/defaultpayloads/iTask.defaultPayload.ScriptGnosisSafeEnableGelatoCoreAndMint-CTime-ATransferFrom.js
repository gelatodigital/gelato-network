import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptGnosisSafeEnableGelatoCoreAndMint-CTime-ATransferFrom",
  `Returns a hardcoded payload for ScriptEnableGelatoCoreAndMint for ConditionTimestampPasssed and ActionERC20TransferFrom`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const payload = await run(
        "gsp:scripts:payload:ScriptGnosisSafeEnableGelatoCoreAndMint",
        {
          conditionname: "ConditionTimestampPasssed",
          actionname: "ActionERC20TransferFrom",
          log
        }
      );
      if (log) console.log(payload);
      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
