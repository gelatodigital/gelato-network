pragma solidity ^0.5.10;

interface IGelatoAction {
    function gelatoCore() external view returns(address);
    function interactionContract() external view returns(address);
    function actionSelector() external view returns(bytes4);
    function actionGasStipend() external view returns(uint256);
    function actionConditionsFulfilled(address _executionClaimOwner,
                                       bytes calldata _specificActionParams
    )
        external
        view
        returns(bool);
    function cancel(uint256 _executionClaimId,
                    address _executionClaimOwner
    )
        external
        returns(bool);
}