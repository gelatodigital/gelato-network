import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:TriggerMinBalanceIncrease",
  `Returns a hardcoded triggerPayloadWithSelector of TriggerMinBalanceIncrease`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "TriggerMinBalanceIncrease";
      // fired(address _coin, address _account, uint256 _refBalance)
      const functionname = "fired";
      // Params
      const { DAI: coin } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const { GelatoUserProxy: account } = await run("bre-config", {
        deployments: true
      }); // ETH
      const refBalance = "1";
      const inputs = [account, coin, refBalance];
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
