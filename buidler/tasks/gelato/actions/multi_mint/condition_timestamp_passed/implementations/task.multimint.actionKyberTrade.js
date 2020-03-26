// Buidler config
import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";

// Javascript Ethereum API Library
import { utils } from "ethers";

export default task(
  "ga-multimint",
  `TX to ActionMultiMintForConditionTimestampPassed on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // To avoid mistakes default log to true
      log = true;

      if (log) await run("block-number", { log });

      // Contract Addresses
      const {
        ActionMultiMintForConditionTimestampPassed: actionMultiMintTimeConditionAddress
      } = await run("bre-config", { deployments: true });

      // Non-Default Params for ActionMultiMintForConditionTimestampPassed
      const { default: gelatoexecutor } = await run("bre-config", {
        addressbookcategory: "gelatoExecutor"
      });
      const numberofmints = "2";

      // Encode the payload for the call to MultiMintForTimeCondition.multiMint
      const actionMultiMintForConditionTimestampPassedPayloadWithSelector = await run(
        "gc-mintexecclaim:defaultpayload:ActionMultiMintForConditionTimestampPassed",
        {
          gelatoexecutor,
          numberofmints,
          log
        }
      );

      // ReadInstance of GelatoCore
      const mintinDepositPerMint = await run("gc-getmintingdepositpayable", {
        gelatoexecutor,
        conditionname: "ConditionTimestampPassed",
        actionname: "ActionKyberTrade",
        log
      });

      // MSG VALUE for payable mint function
      const msgValue = mintinDepositPerMint.mul(numberofmints);

      if (log) {
        const msgValueETH = utils.formatUnits(msgValue, "ether");
        const ethUSDPrice = await run("eth", { usd: true, log });
        const msgValueUSD = (ethUSDPrice * parseFloat(msgValueETH)).toFixed(2);
        console.log(
          `\nMinting Deposit for ${numberofmints} mints: ${msgValueETH}ETH (${msgValueUSD}$)\n`
        );
      }

      // send tx to PAYABLE contract method
      // Read-Write Instance of UserProxy
      const { luis: userProxyAddress } = await run("bre-config", {
        addressbookcategory: "userProxy"
      });
      const userProxyContract = await run("instantiateContract", {
        contractname: "GelatoUserProxy",
        contractaddress: userProxyAddress,
        write: true
      });

      // ❗Send TX To MultiMint
      const multiMintTx = await userProxyContract.delegatecall(
        actionMultiMintTimeConditionAddress,
        actionMultiMintForConditionTimestampPassedPayloadWithSelector,
        {
          value: msgValue,
          gasLimit: 3500000
        }
      );
      if (log)
        console.log(
          `\nuserProxy.executeDelegatecall(multiMintForTimeCondition) txHash:\n${multiMintTx.hash}`
        );
      if (log) console.log("\nwaiting for transaction to get mined\n");

      // Wait for TX to get mined
      await multiMintTx.wait();

      // Automatic ERC20 Approval
      if (log) console.log("\nCaution: ERC20 Approval for userProxy needed\n");

      return multiMintTx.hash;
    } catch (err) {
      console.log(err);
    }
  });
