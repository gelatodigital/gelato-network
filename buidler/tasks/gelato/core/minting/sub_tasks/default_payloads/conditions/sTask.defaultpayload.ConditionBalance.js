import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mintexecclaim:defaultpayload:ConditionBalance",
  `Returns a hardcoded conditionPayload of ConditionBalance`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "ConditionBalance";
      // ok(address _token, address _account, uint256 _refBalance)
      const functionname = "ok";
      // Params
      const { luis: account } = await run("bre-config", {
        addressbookcategory: "EOA"
      });
      /*const { DAI: coin } = await run("bre-config", {
        addressbookcategory: "erc20"
      });*/
      const { ETH: coin } = await run("bre-config", {
        addressbookcategory: "kyber"
      });
      const refBalance = utils.parseUnits("6", 18);
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
