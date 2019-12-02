// Javascript Ethereum API Library
const ethers = require("ethers");

exports.getMultiMintForTimeTriggerPayloadWithSelector = (
  selectedExecutor,
  timeTrigger,
  startTime,
  action,
  actionPayloadWithSelector,
  intervalSpan,
  numberOfMints
) => {
  const multiMintABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_selectedExecutor" },
        { type: "address", name: "_timeTrigger" },
        { type: "uint256", name: "_startTime" },
        { type: "address", name: "_action" },
        { type: "bytes", name: "_actionPayloadWithSelector" },
        { type: "uint256", name: "_intervalSpan" },
        { type: "uint256", name: "_numberOfMints" }
      ]
    }
  ];
  const interface = new ethers.utils.Interface(multiMintABI);

  const encodedMultiMintPayloadWithSelector = interface.functions.action.encode(
    [
      selectedExecutor,
      timeTrigger,
      startTime,
      action,
      actionPayloadWithSelector,
      intervalSpan,
      numberOfMints
    ]
  );

  return encodedMultiMintPayloadWithSelector;
};
