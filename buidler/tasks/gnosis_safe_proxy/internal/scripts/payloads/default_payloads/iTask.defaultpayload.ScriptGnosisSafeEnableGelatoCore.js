import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptGnosisSafeEnableGelatoCore",
  `Returns a hardcoded payload for the 'data' field of the initializer payload`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const gelatoCoreAddress = await run("bre-config", {
        deployments: true,
        contractname: "GelatoCore"
      });
      const payload = await run("abi-encode-withselector", {
        contractname: "ScriptGnosisSafeEnableGelatoCore",
        functionname: "enableGelatoCoreModule",
        inputs: [gelatoCoreAddress]
      });
      if (log) {
        console.log(
          `\n Payload for ScriptGnosisSafeEnableGelatoCoreAndMint\
             \n GelatoCore: ${gelatoCoreAddress}\
             \n Payload:\n ${payload}\n`
        );
      }
      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
