pragma solidity ^0.5.10;

import '../../../0_gelato_standards/2_GTA_standards/GTA.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

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
    function cancel(uint256, address)  // ecID, ecOwner
        msgSenderIsGelatoCore
        public
        returns(bool)
    {
        return true;
    }

    // FN for standardised action condition checking by GTAIs
    // Can be overriden inside child actions - if needed.
    function actionConditionsFulfilled(address, bytes memory)
        public
        view
        returns(bool)
    {
        return true;
    }

    // _____ ERC20 optionalities _________________________________________________
    using SafeERC20 for ERC20;

    function actionHasERC20Allowance(address _token,
                                     address _tokenOwner,
                                     uint256 _allowance
    )
        public
        view
        returns(bool)
    {
        require(_token != address(0),
            "GelatatoActionsStandard.isERC20Approved: _token zero-value"
        );
        require(_tokenOwner != address(0),
            "GelatatoActionsStandard.isERC20Approved: _tokenOwner zero-value"
        );
        require(_allowance != 0,
            "GelatatoActionsStandard.isERC20Approved: _allowance zero-value"
        );
        if (ERC20(_token).allowance(_tokenOwner, address(this)) >= _allowance) {
            return true;
        } else {
            return false;
        }
    }

    function _safeApprove(address _spender,
                          uint256 _value
    )
        internal
        returns(bool)
    {

    }
}