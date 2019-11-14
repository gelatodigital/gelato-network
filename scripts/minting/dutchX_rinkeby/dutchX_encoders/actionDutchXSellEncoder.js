// Javascript Ethereum API Library
const ethers = require("ethers");

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


