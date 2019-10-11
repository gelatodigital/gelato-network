pragma solidity ^0.5.10;

import '../GTA.sol';

contract GelatoActionsStandard is GTA
{
    address internal interactionContract;
    bytes4 internal actionSelector;
    uint256 internal actionGasStipend;

    function getInteractionContract() external returns(address) {return interactionContract;}
    function getActionSelector() external returns(bytes4) {return actionSelector;}
    function getActionGasStipend() external returns(uint256) {return actionGasStipend;}

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

    // Events
    event LogAction(uint256 indexed executionClaimId,
                    address indexed user
    );

    // FN for standardised action condition checking by GTAIs
    // Derived contract must override it, to extend it
    function actionConditionsFulfilled(// Standard Param
                                       address,  // user
                                       // Specific Param(s)
                                       bytes calldata  // specificActionParams
    )
        external
        view
        returns(bool)
    {
        return true;
    }

    // Cancellation function always called by gelatoCore.cancelExecutionClaim()
    //  For forward compatibility with actions that might implement more
    // elaborate state (e.g. escrowing funds) and that need to do a cleanup
    event LogActionCancellation(uint256 indexed executionClaimId,
                                address indexed user
    );
    // Derived contract must override it, to extend it
    function cancel(uint256, address)  // executionClaimId, user
        msgSenderIsGelatoCore
        external
        returns(bool)
    {
        return true;
    }
}