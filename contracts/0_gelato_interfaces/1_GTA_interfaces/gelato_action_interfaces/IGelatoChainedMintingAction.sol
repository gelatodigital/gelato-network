pragma solidity ^0.5.10;

interface IGelatoChainedMintingAction {
    // IGelatoAction
    function getGelatoCore() external returns(address);
    function getInteractionContract() external view returns(address);
    function getActionSelector() external view returns(bytes4);
    function getActionGasStipend() external view returns(uint256);
    function actionConditionsFulfilled(address _user,
                                       bytes calldata _specificActionParams
    )
        external
        view
        returns(bool);
    function cancel(uint256 _executionClaimId,
                    address _user
    )
        external
        returns(bool);

    event LogAction(uint256 indexed executionClaimId,
                    address indexed user
    );
    event LogActionCancellation(uint256 indexed executionClaimId,
                                address indexed user
    );

    // GelatoChainedMintingStandard interface
    function getMintingGTAI() external view returns(address);
    function getChainedTrigger() external view returns(address);
    function getChainedAction() external view returns(address);

    event LogGTAChainedMinting(uint256 indexed executionClaimId);
}