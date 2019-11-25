// Javascript Ethereum API Library
const ethers = require("ethers");

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
          { type: "bytes", name: "_actionPayloadWithSelector" },
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