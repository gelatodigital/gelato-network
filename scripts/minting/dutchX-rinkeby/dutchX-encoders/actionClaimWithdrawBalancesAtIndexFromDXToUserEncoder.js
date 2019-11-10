// Javascript Ethereum API Library
const ethers = require("ethers");

exports.getActionClaimWithdrawBalancesAtIndexFromDXToUserPayloadWithSelector = (
  // action params
  _user,
  _sellToken,
  _buyToken,
  _auctionIndex
) => {
  const actionClaimWithdrawBalancesAtIndexFromDXToUserABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_user" },
        { type: "address", name: "_sellToken" },
        { type: "address", name: "_buyToken" },
        { type: "uint256", name: "_auctionIndex" }
      ],
      outputs: [{ type: "bool", name: "" }]
    }
  ];
  const interface = new ethers.utils.Interface(
    actionClaimWithdrawBalancesAtIndexFromDXToUserABI
  );

  const actionPayloadWithSelector = interface.functions.action.encode([
    _user,
    _sellToken,
    _buyToken,
    _auctionIndex
  ]);

  return actionPayloadWithSelector;
};
