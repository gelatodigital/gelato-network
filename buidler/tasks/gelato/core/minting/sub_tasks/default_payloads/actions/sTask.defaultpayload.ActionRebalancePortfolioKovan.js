import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mint:defaultpayload:ActionRebalancePortfolioKovan",
  `Returns a hardcoded actionData of ActionRebalancePortfolioKovan`
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
      // const provider = await run("handleGelatoProvider");

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionRebalancePortfolioKovan",
        functionname: "action",
        inputs: []
      });

      return actionData;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
