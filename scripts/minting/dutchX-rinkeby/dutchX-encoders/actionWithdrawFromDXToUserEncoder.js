// Javascript Ethereum API Library
const ethers = require("ethers");

exports.getActionWithdrawFromDXToUserPayloadWithSelector = (
  // action params
  _user,
  _sellToken,
  _buyToken,
  _auctionIndex,
  _sellAmountAfterFee
) => {
  const actionWithdrawFromDXToUserABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_user" },
        { type: "address", name: "_sellToken" },
        { type: "address", name: "_buyToken" },
        { type: "uint256", name: "_auctionIndex" },
        { type: "uint256", name: "_sellAmountAfterFee" }
      ],
      outputs: [{ type: "bool", name: "" }]
    }
  ];
  const interface = new ethers.utils.Interface(actionWithdrawFromDXToUserABI);

  const actionPayloadWithSelector = interface.functions.action.encode([
    _user,
    _sellToken,
    _buyToken,
    _auctionIndex,
    _sellAmountAfterFee
  ]);

  return actionPayloadWithSelector;
};
