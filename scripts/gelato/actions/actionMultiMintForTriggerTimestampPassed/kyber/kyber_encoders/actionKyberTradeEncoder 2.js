// Javascript Ethereum API Library
import { utils } from "ethers";

export function getEncodedActionKyberTradeParams(
  user,
  src,
  dest,
  srcAmount,
  minConversionRate
) {
  const abiCoder = utils.defaultAbiCoder;
  const encodedActionParams = abiCoder.encode(
    ["address", "address", "address", "uint256", "uint256"],
    [user, src, dest, srcAmount, minConversionRate]
  );
  return encodedActionParams;
}

export function getActionKyberTradePayloadWithSelector(
  // action params
  _user,
  _src,
  _srcAmt,
  _dest,
  _minConversionRate
) {
  const actionKyberTradeABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_user" },
        { type: "address", name: "_src" },
        { type: "uint256", name: "_srcAmt" },
        { type: "address", name: "_dest" },
        { type: "uint256", name: "_minConversionRate" }
      ]
    }
  ];
  const iFace = new utils.Interface(actionKyberTradeABI);

  const actionPayloadWithSelector = iFace.functions.action.encode([
    _user,
    _src,
    _srcAmt,
    _dest,
    _minConversionRate
  ]);

  return actionPayloadWithSelector;
}
