// Buidler config
import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";
import sleep from "../../../../../../helpers/async/sleep";

// Javascript Ethereum API Library
import { Contract, utils } from "ethers";

// ABI encoding function
import encodeActionKyberTradePayloadWithSelector from "../../../kyber/trade/abiEncodeWithSelector";
import encodeMultiMintPayloadWithSelector from "../abiEncodeWithSelector";

export default task(
  "gelato-action-multimint",
  `TX to ActionMultiMintForTriggerTimestampPassed on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // To avoid mistakes default log to true
      log = true;

      // Contract Addresses
      const {
        ActionKyberTrade: actionKyberTradeAddress,
        ActionMultiMintForTriggerTimestampPassed: actionMultiMintTimeTriggerAddress,
        GelatoCore: gelatoCoreAddress,
        TriggerTimestampPassed: triggerTimestampPassedAddress
      } = await run("bre-config", { deployments: true });

      const { DAI: src, KNC: dest } = await run("bre-config", {
        addressbookcategory: "erc20"
      });

      const { proxy: kyberProxyAddress } = await run("bre-config", {
        addressbookcategory: "kyber"
      });

      // Initialize provider and signer
      const provider = ethers.provider;
      const [signer] = await ethers.signers();

      const blockNumber = await ethers.provider.getBlockNumber();

      if (log)
        console.log(
          `\nCurrent block number on ${network.name}: ${blockNumber}\n`
        );

      // Arguments for function call to multiMintProxy.multiMint()
      const START_TIME = Math.floor(Date.now() / 1000);
      // Specific Action Params: encoded during main() execution
      const SRC_AMOUNT = utils.parseUnits("10", 18);
      // minConversionRate async fetched from KyberNetwork during main() execution
      const SELECTED_EXECUTOR_ADDRESS =
        "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
      const INTERVAL_SPAN = "120"; // 300 seconds
      const NUMBER_OF_MINTS = "2";

      // Read Instance of KyberContract
      const kyberABI = [
        "function getExpectedRate(address src, address dest, uint srcQty) view returns(uint,uint)"
      ];
      const kyberContract = new Contract(kyberProxyAddress, kyberABI, provider);
      // Fetch the slippage rate from KyberNetwork and assign it to minConversionRate
      const [_, minConversionRate] = await kyberContract.getExpectedRate(
        src,
        dest,
        SRC_AMOUNT
      );
      if (log)
        console.log(
          `\n\t\t minConversionRate: ${utils.formatUnits(
            minConversionRate,
            18
          )}\n`
        );

      const userProxyAddress = await run("gelato-core-getproxyofuser");

      // Encode the specific params for ActionKyberTrade
      const ACTION_KYBER_TRADE_PAYLOAD_WITH_SELECTOR = encodeActionKyberTradePayloadWithSelector(
        signer._address, // user
        userProxyAddress,
        src,
        SRC_AMOUNT,
        dest,
        minConversionRate
      );
      if (log)
        console.log(
          `\nActionKyberTrade payloadWithSelector: \n ${ACTION_KYBER_TRADE_PAYLOAD_WITH_SELECTOR}\n`
        );

      // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
      const ACTION_MULTI_MINT_PAYLOAD_WITH_SELECTOR = encodeMultiMintPayloadWithSelector(
        gelatoCoreAddress,
        SELECTED_EXECUTOR_ADDRESS,
        triggerTimestampPassedAddress,
        START_TIME.toString(),
        actionKyberTradeAddress,
        ACTION_KYBER_TRADE_PAYLOAD_WITH_SELECTOR,
        INTERVAL_SPAN,
        NUMBER_OF_MINTS
      );
      if (log)
        console.log(
          `\nActionMultiMintForTriggerTimestampPassed payload with selector:\n ${ACTION_MULTI_MINT_PAYLOAD_WITH_SELECTOR}\n`
        );

      // Getting the current Ethereum price
      const ethUSDPrice = await run("eth-price");
      if (log) console.log(`\nETH-USD: ${ethUSDPrice} $`);

      // ReadInstance of GelatoCore
      const gelatoCoreABI = [
        "function getMintingDepositPayable(address _selectedExecutor, address _trigger, address _action) view returns(uint256 mintingDepositPayable)"
      ];
      const gelatoCoreContract = new Contract(
        gelatoCoreAddress,
        gelatoCoreABI,
        provider
      );
      const MINTING_DEPOSIT_PER_MINT = await gelatoCoreContract.getMintingDepositPayable(
        SELECTED_EXECUTOR_ADDRESS,
        triggerTimestampPassedAddress,
        actionKyberTradeAddress
      );
      if (log)
        console.log(
          `\nMinting Deposit Per Mint: ${utils.formatUnits(
            MINTING_DEPOSIT_PER_MINT,
            "ether"
          )} ETH \t\t${ethUSDPrice *
            parseFloat(utils.formatUnits(MINTING_DEPOSIT_PER_MINT, "ether"))} $`
        );

      const MSG_VALUE = MINTING_DEPOSIT_PER_MINT.mul(NUMBER_OF_MINTS);
      if (log)
        console.log(
          `\nMinting Deposit for ${NUMBER_OF_MINTS} mints: ${utils.formatUnits(
            MSG_VALUE,
            "ether"
          )} ETH \t ${ethUSDPrice *
            parseFloat(utils.formatUnits(MSG_VALUE, "ether"))} $`
        );

      // send tx to PAYABLE contract method
      // Read-Write Instance of UserProxy
      const userProxyABI = [
        "function executeDelegatecall(address _action, bytes _actionPayloadWithSelector, uint256 _actionGas) external payable returns(bool success, bytes returndata)"
      ];
      const userProxyContract = new Contract(
        userProxyAddress,
        userProxyABI,
        signer
      );
      const tx = await userProxyContract.executeDelegatecall(
        actionMultiMintTimeTriggerAddress,
        ACTION_MULTI_MINT_PAYLOAD_WITH_SELECTOR,
        "4000000", // _actionGas
        {
          value: MSG_VALUE,
          gasLimit: 2000000
        }
      );
      if (log)
        console.log(
          `\nuserProxy.executeDelegatecall(multiMintForTimeTrigger) txHash:\n${tx.hash}`
        );
      if (log) console.log("\nwaiting for transaction to get mined\n");
      const txReceipt = await tx.wait();

      await run("erc20", {
        erc20address: src,
        approve: true,
        spender: userProxyAddress,
        amount: SRC_AMOUNT.mul(NUMBER_OF_MINTS),
        log
      });

      return txReceipt;
    } catch (err) {
      console.log(err);
    }
  });
