import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:TriggerBalance",
  `Returns a hardcoded triggerPayloadWithSelector of TriggerBalance`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "TriggerBalance";
      // fired(address _coin, address _account, uint256 _refBalance)
      const functionname = "fired";
      // Params
      const { GelatoUserProxy: account } = await run("bre-config", {
        deployments: true
      });
      const { DAI: coin } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const refBalance = "20000000000000000000";
      const greaterElseSmaller = true;
      const inputs = [account, coin, refBalance, greaterElseSmaller];
      // Encoding
      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname,
        functionname,
        inputs,
        log
      });
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
