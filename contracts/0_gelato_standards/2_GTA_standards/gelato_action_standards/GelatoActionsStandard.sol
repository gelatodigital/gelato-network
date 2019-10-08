pragma solidity ^0.5.10;

import '../../../0_gelato_standards/2_GTA_standards/GTA.sol';

contract GelatoActionsStandard is GTA
{
    address public interactionContract;
    bytes4 public actionSelector;
    uint256 public actionGasStipend;

    constructor(address payable _gelatoCore,
                address _interactionContract,
                string memory _actionSignature,
                uint256 _actionGasStipend
    )
        GTA(_gelatoCore)
        internal
    {
        interactionContract = _interactionContract;
        actionSelector = bytes4(keccak256(bytes(_actionSignature)));
        actionGasStipend = _actionGasStipend;
    }

    modifier msgSenderIsGelatoCore() {
        require(msg.sender == address(gelatoCore),
            "GelatoActionsStandard.msgSenderIsGelatoCore(): failed"
        );
        _;
    }

    // Action Events
    event LogAction(uint256 indexed _executionClaimId,
                    address indexed _executionClaimOwner
    );

    // Cancellation function always called by gelatoCore.cancelExecutionClaim()
    //  For forward compatibility with actions that might implement more
    // elaborate state (e.g. escrowing funds) and that need to do a cleanup
    function cancel(uint256, address)  // executionClaimID, executionClaimOwner
        msgSenderIsGelatoCore
        public
        returns(bool)
    {
        return true;
    }

    // FN for standardised action condition checking by GTAIs
    // Can be overriden inside child actions - if needed.
    function actionConditionsFulfilled(// Standard Param
                                       address,  // executionClaimOwner
                                       // Specific Param(s)
                                       bytes memory
    )
        public
        view
        returns(bool)
    {
        return true;
    }
}