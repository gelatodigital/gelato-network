pragma solidity ^0.5.10;

import './gelato_actions_base/GelatoActionsStandard.sol'

contract ActionMintOnGelatoCore is GelatoActionsStandard {

    string constant public actionSignature
        = "mintOnGelatoCore(address, bytes, address, bytes, uint256, address)";

    constructor(address _GelatoCore, uint256 _actionGasStipend)
        public
        GelatoActionsStandard(_GelatoCore, actionSignature, _actionGasStipend)
    {}

    function mintOnGelatoCore(address _triggerAddress,
                              bytes calldata _triggerPayload,
                              address _actionAddress,
                              bytes calldata _actionPayload,
                              uint256 _actionGasStipend
                              address _executionClaimOwner
    )
        external
        payable
    {
        super.action();
        require(gelatoCore.mintExecutionClaim(_triggerAddress,
                                              _triggerPayload,
                                              _actionAddress,
                                              _actionPayload,
                                              _actionGasStipend,
                                              _executionClaimOwner
            ), "ActionMintOnGelatoCore.mintOnGelatoCore failed"
        );
    }

}