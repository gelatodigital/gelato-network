pragma solidity ^0.5.10;

interface IGelatoAction {
    function gelatoCore() external view returns(address);
    function interactionContract() external view returns(address);
    function actionSelector() external view returns(bytes4);
    function actionGasStipend() external view returns(uint256);
    function actionConditionsFulfilled(bytes calldata _actionPayload)
        external
        view
        returns(bool);
    function cancel(bytes calldata) external returns(bool);
    function actionHasERC20Allowance(address _token,
                                     address _tokenOwner,
                                     uint256 _allowance
    )
        external
        view
        returns(bool);
}