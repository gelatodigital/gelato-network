pragma solidity ^0.5.10;

interface IGTAIFull
{
    // ______________ GTAIStandard _________________________________________
    function activateTA(address _trigger,
                        bytes calldata _specificTriggerParams,
                        address _action,
                        bytes calldata _specificActionParams,
                        uint256 _executionClaimLifespan
    )
        external
        payable
        returns(bool);

    event LogActivation(uint256 executionClaimId,
                        address indexed executionClaimOwner,
                        address indexed trigger,
                        address indexed action
    );
    // =================

    // ______________ GTAIChainedStandard __________________________________
    function activateChainedTA(address _executionClaimOwner,
                               address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload,
                               uint256 _chainedExecutionClaimLifespan
    )
        external
        returns(bool);

    event LogChainedActivation(uint256 indexed executionClaimId,
                               address indexed chainedTrigger,
                               address indexed chainedAction,
                               address minter
    );
    // =================

    // ______________ IcedOut ______________________________________________
    // view
    function getGelatoCore() external view returns(address);
    function getSelectedExecutor() external view returns(address payable);
    function getGTAIGasPrice() external view returns(uint256);
    // state mutating
    function acceptEther() external payable;
    function selectExecutor(address payable _executor) external;
    function setGTAIGasPrice(uint256 _gtaiGasPrice) external;
    function topUpBalanceOnGelato() external payable;
    function withdrawBalanceFromGelato(uint256 _withdrawAmount) external;
    function withdrawBalanceToOwner(uint256 _withdrawAmount) external;
    function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount) external;
    // =================
}