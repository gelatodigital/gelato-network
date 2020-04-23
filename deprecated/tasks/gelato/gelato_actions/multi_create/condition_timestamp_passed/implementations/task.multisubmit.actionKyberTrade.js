// Buidler config
import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";

// Javascript Ethereum API Library
import { utils } from "ethers";

export default task(
  "ga-multisubmit",
  `TX to ActionMultiSubmitForConditionTimestampPassed on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // To avoid mistakes default log to true
      log = true;

      if (log) await run("block-number", { log });

      // Contract Addresses
      const {
        ActionMultiSubmitForConditionTimestampPassed: actionMultiSubmitTimeConditionAddress,
      } = await run("bre-config", { deployments: true });

      // Non-Default Params for ActionMultiSubmitForConditionTimestampPassed
      const { default: gelatoexecutor } = await run("bre-config", {
        addressbookcategory: "gelatoExecutor",
      });
      const numberofsubmissions = "2";

      // Encode the payload for the call to MultiSubmitForTimeCondition.multiCreate
      const actionMultiSubmitForConditionTimestampPassedPayloadWithSelector = await run(
        "gc-submittask:defaultpayload:ActionMultiSubmitForConditionTimestampPassed",
        {
          gelatoexecutor,
          numberofsubmissions,
          log,
        }
      );

      // ReadInstance of GelatoCore
      const depositPerSubmission = await run("gc-getsubmissiondepositpayable", {
        gelatoexecutor,
        conditionname: "ConditionTimestampPassed",
        actionname: "ActionKyberTrade",
        log,
      });

      // MSG VALUE for payable create function
      const msgValue = depositPerSubmission.mul(numberofsubmissions);

      if (log) {
        const msgValueETH = utils.formatUnits(msgValue, "ether");
        const ethUSDPrice = await run("eth", { usd: true, log });
        const msgValueUSD = (ethUSDPrice * parseFloat(msgValueETH)).toFixed(2);
        console.log(
          `\nSubmission Deposit for ${numberofsubmissions} creates: ${msgValueETH}ETH (${msgValueUSD}$)\n`
        );
      }

      // send tx to PAYABLE contract method
      // Read-Write Instance of UserProxy
      const { luis: userProxyAddress } = await run("bre-config", {
        addressbookcategory: "userProxy",
      });
      const userProxyContract = await run("instantiateContract", {
        contractname: "GelatoUserProxy",
        contractaddress: userProxyAddress,
        write: true,
      });

      // ❗Send TX To MultiSubmit
      const multiSubmitTx = await userProxyContract.delegatecall(
        actionMultiSubmitTimeConditionAddress,
        actionMultiSubmitForConditionTimestampPassedPayloadWithSelector,
        {
          value: msgValue,
          gasLimit: 3500000,
        }
      );
      if (log)
        console.log(
          `\nuserProxy.executeDelegatecall(multiCreateForTimeCondition) txHash:\n${multiSubmitTx.hash}`
        );
      if (log) console.log("\nwaiting for transaction to get mined\n");

      // Wait for TX to get mined
      await multiSubmitTx.wait();

      // Automatic ERC20 Approval
      if (log) console.log("\nCaution: ERC20 Approval for userProxy needed\n");

      return multiSubmitTx.hash;
    } catch (err) {
      console.log(err);
    }
  });
