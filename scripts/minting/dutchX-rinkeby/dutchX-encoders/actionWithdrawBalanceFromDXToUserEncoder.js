// Javascript Ethereum API Library
const ethers = require("ethers");

exports.getActionWithdrawBalanceFromDXToUserPayloadWithSelector = (
  // action params
  _user,
  _token
) => {
  const actionWithdrawBalanceFromDXToUserABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_user" },
        { type: "address", name: "_token" }
      ],
      outputs: [{ type: "bool", name: "" }]
    }
  ];
  const interface = new ethers.utils.Interface(
    actionWithdrawBalanceFromDXToUserABI
  );

  const actionPayloadWithSelector = interface.functions.action.encode([
    _user,
    _token
  ]);

  return actionPayloadWithSelector;
};
