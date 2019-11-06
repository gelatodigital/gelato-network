// Javascript Ethereum API Library
const ethers = require("ethers");

exports.getEncodedActionKyberTradeParams = (
  user,
  src,
  dest,
  srcAmount,
  minConversionRate
) => {
  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodedActionParams = abiCoder.encode(
    ["address", "address", "address", "uint256", "uint256"],
    [user, src, dest, srcAmount, minConversionRate]
  );
  return encodedActionParams;
};

exports.getActionKyberTradePayloadWithSelector = (
  // action params with selector
  _src,
  _srcAmt,
  _dest,
  _user,
  _minConversionRate
) => {
  const actionDutchXSellABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_src" },
        { type: "uint256", name: "_srcAmt" },
        { type: "address", name: "_dest" },
        { type: "address", name: "_user" },
        { type: "uint256", name: "_minConversionRate" }
      ]
    }
  ];
  const interface = new ethers.utils.Interface(actionDutchXSellABI);

  const actionPayloadWithSelector = interface.functions.action.encode([
    _src,
    _srcAmt,
    _dest,
    _user,
    _minConversionRate
  ]);

  return actionPayloadWithSelector;
};

exports.getActionDutchXSellPayloadWithSelector = (
  // action params with selector
  _user,
  _sellToken,
  _buyToken,
  _sellAmount
) => {
  const actionDutchXSellABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_user" },
        { type: "address", name: "_sellToken" },
        { type: "address", name: "_buyToken" },
        { type: "uint256", name: "_sellAmount" }
      ],
      outputs: [
        { type: "bool", name: "" },
        { type: "uint256", name: "" },
        { type: "uint256", name: "" }
      ]
    }
  ];
  const interface = new ethers.utils.Interface(actionDutchXSellABI);

  const actionPayloadWithSelector = interface.functions.action.encode([
    _user,
    _sellToken,
    _buyToken,
    _sellAmount
  ]);

  return actionPayloadWithSelector;
};

exports.getMultiMintForTimeTriggerPayloadWithSelector = (
  timeTrigger,
  startTime,
  action,
  actionPayloadWithSelector,
  selectedExecutor,
  intervalSpan,
  numberOfMints
) => {
  const multiMintABI = [
    {
      name: "multiMint",
      type: "function",
      inputs: [
        { type: "address", name: "_timeTrigger" },
        { type: "uint256", name: "_startTime" },
        { type: "address", name: "_action" },
        { type: "bytes", name: "_actionPayload" },
        { type: "address", name: "_selectedExecutor" },
        { type: "uint256", name: "_intervalSpan" },
        { type: "uint256", name: "_numberOfMints" }
      ]
    }
  ];
  const interface = new ethers.utils.Interface(multiMintABI);

  const encodedMultiMintPayloadWithSelector = interface.functions.multiMint.encode(
    [
      timeTrigger,
      startTime,
      action,
      actionPayloadWithSelector,
      selectedExecutor,
      intervalSpan,
      numberOfMints
    ]
  );

  return encodedMultiMintPayloadWithSelector;
};
