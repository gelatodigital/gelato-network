pragma solidity ^0.5.10;

interface IGelatoAction {
    function getGelatoCore() external returns(address);
    function getInteractionContract() external view returns(address);
    function getActionSelector() external view returns(bytes4);
    function getActionGasStipend() external view returns(uint256);
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

    event LogAction(uint256 indexed executionClaimId,
                    address indexed executionClaimOwner
    );
    event LogActionCancellation(uint256 indexed executionClaimId,
                                address indexed executionClaimOwner
    );
}