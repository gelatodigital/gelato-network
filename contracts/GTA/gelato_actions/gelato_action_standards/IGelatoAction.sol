pragma solidity ^0.5.10;

interface IGelatoAction {
    function gelatoCore() external view returns(address);
    function matchingGelatoCore(address payable _gelatoCore) external view returns(bool);
    function dapp() external view returns(address);
    function actionSelector() external view returns(bytes4);
    function matchingActionSelector(bytes4 _actionSelector) external view returns(bool);
    function actionGasStipend() external view returns(uint256);
    function hasERC20Allowance(address _token,
                               address _tokenOwner,
                               uint256 _allowance
    )
        external
        view
        returns(bool);
    function conditionsFulfilled(bytes calldata _payload) external view returns(bool);
}