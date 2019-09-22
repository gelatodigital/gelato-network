pragma solidity ^0.5.10;

import '../../GTA.sol';
import './IGelatoAction.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
// import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

contract GelatoActionsStandard is GTA, IGelatoAction {
    // using SafeERC20 for ERC20;

    address public dapp;
    bytes4 public actionSelector;
    uint256 public actionGasStipend;

    constructor(address _gelatoCore,
                address _dapp,
                string _actionSignature,
                uint256 _actionGasStipend
    )
        GTA(_gelatoCore)
        internal
    {
        dapp = _dapp;
        actionSelector = bytes4(keccak256(bytes(_actionSignature)));
        actionGasStipend = _actionGasStipend;
    }

    // Standard Action Checks
    modifier correctActionSelector() {
        require(bytes4(msg.data) == actionSelector,
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
        if (ERC20(_token).allowance(_tokenOwner, address(this) >= _allowance) {
            return true;
        } else {
            return false;
        }
    }
    modifier ERC20Allowance(address _token,
                            address _tokenOwner,
                            uint256 _allowance)
    {
        require(hasERC20Allowance(address _token,
                                  address _tokenOwner,
                                  uint256 _allowance),
            "GelatoActionsStandard.ERC20Allowance: failed"
        );
        _;
    }

    function conditionsFulfilled(bytes calldata payload)
        internal
        view
        returns(bool)
    {}
}