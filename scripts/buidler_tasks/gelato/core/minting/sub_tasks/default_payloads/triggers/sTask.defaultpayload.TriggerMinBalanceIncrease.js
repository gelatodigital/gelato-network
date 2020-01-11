import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gelato-core-mint:defaultpayload:TriggerMinBalanceIncrease",
  `Returns a hardcoded triggerPayloadWithSelector of TriggerMinBalanceIncrease`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "TriggerMinBalanceIncrease";
      // fired(address _coin, address _account, uint256 _refBalance)
      const functionname = "fired";
      // Params
      const coin = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH
      const account = await run("bre-config", {
        addressbookcategory: "EOA",
        addressbookentry: "luis"
      });
      const refBalance = utils.parseEther("1");
      const inputs = [coin, account, refBalance];
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
