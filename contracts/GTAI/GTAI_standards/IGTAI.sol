pragma solidity ^0.5.10;

interface IGTAI {

    event LogActivation(uint256 executionClaimId,
                        address indexed executionClaimOwner,
                        address indexed trigger,
                        address indexed action
    );

    function activateTA(address _trigger,
                        bytes calldata _triggerParams,
                        address _action,
                        bytes calldata _actionParams
    )
        external
        payable
        returns(bool)
    ; // end

    event LogChainedActivation(address indexed minter,
                               uint256 executionClaimId,
                               address indexed executionClaimOwner,
                               address trigger,
                               address indexed action
    );

    function activateChainedTA(address _trigger,
                               bytes calldata _triggerParams,
                               address _action,
                               bytes calldata _actionParams
    )
        external
        payable
        returns(bool)
    ; // end
}