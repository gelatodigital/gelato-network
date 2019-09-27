pragma solidity ^0.5.10;

import '../../GTA_standards/GTA.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract GelatoActionsStandard is GTA
{
    address public dapp;
    bytes4 public actionSelector;
    uint256 public actionGasStipend;

    constructor(address payable _gelatoCore,
                address _dapp,
                string memory _actionSignature,
                uint256 _actionGasStipend
    )
        GTA(_gelatoCore)
        internal
    {
        dapp = _dapp;
        actionSelector = bytes4(keccak256(bytes(_actionSignature)));
        actionGasStipend = _actionGasStipend;
    }

    function matchingActionSelector(bytes4 _actionSelector)
        public
        view
        returns(bool)
    {
        if (actionSelector == _actionSelector) {
            return true;
        } else {
            return false;
        }
    }

    // Standard Action Checks
    modifier correctActionSelector() {
        bytes4 _actionSelector;
        assembly {
            _actionSelector := mload(add(0x20, calldataload(0)))
        }
        require(_actionSelector == actionSelector,
            "GelatoActionsStandard.correctActionSelector failed"
        );
        _;
    }

    modifier sufficientGas() {
        require(gasleft() >= actionGasStipend,
            "GelatoActionsStandard.sufficientGas failed"
        );
        _;
    }

    function _standardActionChecks()
        onlyGelatoCore
        correctActionSelector
        sufficientGas
        internal
        view
    {}

    // Optional action checks
    function hasERC20Allowance(address _token,
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
    modifier ERC20Allowance(address _token,
                            address _tokenOwner,
                            uint256 _allowance)
    {
        require(hasERC20Allowance(_token, _tokenOwner, _allowance),
            "GelatoActionsStandard.ERC20Allowance: failed"
        );
        _;
    }

    function _conditionsFulfilled(bytes memory payload)
        internal
        view
        returns(bool)
    {}
}