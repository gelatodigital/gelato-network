// Javascript Ethereum API Library
const ethers = require("ethers");

exports.getTriggerDXAuctionClearedPayloadWithSelector = (
  // trigger params
  _sellToken,
  _buyToken,
  _auctionIndex
) => {
  const triggerDXAuctionClearedABI = [
    {
      name: "fired",
      type: "function",
      inputs: [
        { type: "address", name: "_sellToken" },
        { type: "address", name: "_buyToken" },
        { type: "uint256", name: "_auctionIndex" }
      ],
      outputs: [{ type: "bool", name: "" }]
    }
  ];
  const interface = new ethers.utils.Interface(triggerDXAuctionClearedABI);

  const triggerPayloadWithSelector = interface.functions.fired.encode([
    _sellToken,
    _buyToken,
    _auctionIndex
  ]);

  return triggerPayloadWithSelector;
};
