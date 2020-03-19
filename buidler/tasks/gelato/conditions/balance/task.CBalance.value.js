import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "g-cbalance-value",
  `Calls <condition>.value(<conditionPayload>) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // Params
      const { luis: account } = await run("bre-config", {
        addressbookcategory: "EOA"
      });
      /*const { DAI: coin } = await run("bre-config", {
        addressbookcategory: "erc20"
      }); */
      const coin = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH

      const refBalance = utils.parseUnits("24", 18);
      const greaterElseSmaller = true;

      // ConditionRead Instance
      const contractname = "ConditionBalance"
      const conditionContract = await run("instantiateContract", {
        contractname,
        read: true
      });
      // mintExecClaim TX (payable)
      const value = await conditionContract.value(
        account,
        coin,
        refBalance,
        greaterElseSmaller
      );

      if (log) {
        console.log(
          `\nContractName:     ${contractname}\
           \nContractAddress:  ${conditionContract.address}\
           \nAccount:          ${account}\
           \nCoin:             ${coin}\
           \nValue:            ${value}\
           \nFormatted:        ${utils.formatUnits(value, 18)}`
        );
      }
      return value;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
