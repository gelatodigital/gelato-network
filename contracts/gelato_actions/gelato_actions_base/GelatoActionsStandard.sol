pragma solidity ^0.5.10;

import '../../gelato_core/GelatoCore.sol';

contract GelatoActionsStandard {
    GelatoCore public gelatoCore;
    bytes4 public actionSelector;
    uint256 public actionGasStipend;

    constructor(address _gelatoCore,
                string _actionSignature,
                uint256 _actionGasStipend
    )
        internal
    {
        gelatoCore = GelatoCore(_gelatoCore);
        actionSelector = bytes4(keccak256(bytes(_actionSignature)));
        actionGasStipend = _actionGasStipend;
    }

    modifier onlyGelatoCore() {
        require(msg.sender == address(gelatoCore),
            "GelatoActionsStandard.onlyGelatoCore failed"
        );
        _;
    }

    modifier correctSelector() {
        require(bytes4(msg.data) == actionSelector,
            "GelatoActionsStandard.correctSelector failed"
        );
        _;
    }

    modifier sufficientGas() {
        require(gasleft() >= actionGasStipend,
            "GelatoActionsStandard.sufficientGas failed"
        );
        _;
    }

    function _action()
        onlyGelatoCore
        correctSelector
        sufficientGas
        internal
    {}
}