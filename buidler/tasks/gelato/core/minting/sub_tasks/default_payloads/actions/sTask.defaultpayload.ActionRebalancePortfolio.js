import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mint:defaultpayload:ActionRebalancePortfolio",
  `Returns a hardcoded actionPayload of ActionRebalancePortfolio`
)
  .addOptionalPositionalParam(
    "providerindex",
    "which mnemoric index should be selected for provider (default index 0)",
    0,
    types.int
  )
  .addFlag("log")
  .setAction(async ({ log, providerindex }) => {
    try {
      const signers = await ethers.signers();
      const provider = signers[parseInt(providerindex)];
      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionRebalancePortfolio",
        functionname: "action",
        inputs: [provider._address]
      });
      if (log) console.log(actionPayload);
      return actionPayload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
