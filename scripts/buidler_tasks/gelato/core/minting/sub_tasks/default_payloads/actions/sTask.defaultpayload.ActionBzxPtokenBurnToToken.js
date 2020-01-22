import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:ActionBzxPtokenBurnToToken",
  `Returns a hardcoded actionPayloadWithSelector of ActionBzxPtokenBurnToToken`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "ActionBzxPtokenBurnToToken";
      const functionname = "action";
      // Params
      const { luis: user } = await run("bre-config", {
        addressbookcategory: "EOA"
      });
      const { luis: userProxy } = await run("bre-config", {
        addressbookcategory: "userProxy"
      });
      const { DAI: burnTokenAddress, dsETH2x: pTokenAddress } = await run(
        "bre-config",
        {
          addressbookcategory: "erc20"
        }
      );

      const pTokenContract = await run("instantiateContract", {
        contractname: "IERC20",
        contractaddress: pTokenAddress,
        read: true
      });

      const burnAmount = await pTokenContract.balanceOf(user);

      // Params as sorted array of inputs for abi.encoding
      // action(_user, _userProxy, _burnTokenAddress, _burnAmount, _pTokenAddress)
      const inputs = [
        user, // receiver
        userProxy,
        pTokenAddress,
        burnAmount,
        burnTokenAddress,
        0 // minPriceAllowed
      ];
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
