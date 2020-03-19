import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mint:defaultpayload:ActionRebalancePortfolio",
  `Returns a hardcoded execPayload of ActionRebalancePortfolio`
)
  .addOptionalPositionalParam(
    "providerindex",
    "which mnemoric index should be selected for provider (default index 2)",
    2,
    types.int
  )
  .addFlag("log")
  .setAction(async ({ log = true, providerindex }) => {
    try {
      const provider = await run("handleGelatoProvider");

      const execPayload = await run("abi-encode-withselector", {
        contractname: "ActionRebalancePortfolio",
        functionname: "action",
        inputs: [provider]
      });

      return execPayload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
