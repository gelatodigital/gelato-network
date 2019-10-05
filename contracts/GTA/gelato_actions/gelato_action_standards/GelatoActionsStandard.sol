pragma solidity ^0.5.10;

import '../../GTA_standards/GTA.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

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

    // Action Events
    event LogAction(uint256 indexed _executionClaimId,
                    address indexed _executionClaimOwner
    );

    // FN for standardised action condition checking by GTAIs
    // Can be overriden inside child actions - if needed.
    function actionConditionsFulfilled(bytes memory)
        public
        view
        returns(bool)
    {
        return true;
    }

    // Optional action checks
    function checkERC20Allowance(address _token,
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
    modifier hasERC20Allowance(address _token,
                               address _tokenOwner,
                               uint256 _allowance)
    {
        require(checkERC20Allowance(_token, _tokenOwner, _allowance),
            "GelatoActionsStandard.hasERC20Allowance: failed"
        );
        _;
    }
}