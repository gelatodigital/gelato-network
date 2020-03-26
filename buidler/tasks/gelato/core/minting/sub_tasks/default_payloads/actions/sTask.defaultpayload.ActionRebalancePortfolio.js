import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mintexecclaim:defaultpayload:ActionRebalancePortfolio",
  `Returns a hardcoded actionPayload of ActionRebalancePortfolio`
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

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionRebalancePortfolio",
        functionname: "action",
        inputs: [provider]
      });

      return actionPayload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
