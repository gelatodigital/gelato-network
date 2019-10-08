pragma solidity ^0.5.10;

interface IGTAIFull {
    function getActionExecutionClaimLifespanCap(address _action)
        external
        view
        returns(uint256);

    event LogActivation(uint256 executionClaimId,
                        address indexed executionClaimOwner,
                        address indexed trigger,
                        address indexed action
    );

    function activateTA(address _trigger,
                        bytes calldata _specificTriggerParams,
                        address _action,
                        bytes calldata _specificActionParams,
                        uint256 _executionClaimLifespan
    )
        external
        payable
        returns(bool)
    ; // end

    event LogChainedActivation(uint256 executionClaimId,
                               address indexed executionClaimOwner,
                               address trigger,
                               address indexed action,
                               address indexed minter
    );

    function activateChainedTA(address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload,
                               uint256 _chainedExecutionClaimLifespan,
                               address _executionClaimOwner
    )
        external
        returns(bool);
}