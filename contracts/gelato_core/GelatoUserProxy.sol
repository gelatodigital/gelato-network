pragma solidity ^0.5.11;

import "./interfaces/IGelatoUserProxy.sol";
import "../actions/GelatoActionsStandard.sol";

/// @title GelatoUserProxy
/// @dev find all NatSpecs inside IGelatoUserProxy
contract GelatoUserProxy is IGelatoUserProxy {
    address payable internal user;
    address payable internal gelatoCore;

    constructor(address payable _user)
        public
        noZeroAddress(_user)
    {
        user = _user;
        gelatoCore = msg.sender;
    }

    modifier onlyUser() {
        require(
            msg.sender == user,
            "GelatoUserProxy.onlyUser: failed"
        );
        _;
    }

    modifier auth() {
        require(
            msg.sender == user || msg.sender == gelatoCore,
            "GelatoUserProxy.auth: failed"
        );
        _;
    }

    modifier noZeroAddress(address _) {
        require(
            _ != address(0),
            "GelatoUserProxy.noZeroAddress"
        );
        _;
    }

    function executeCall(
        address _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        payable
        onlyUser
        noZeroAddress(_action)
        returns(bool success, bytes memory returndata)
    {
        (success, returndata) = _action.call(_actionPayloadWithSelector);
        ///@dev we should delete require later - leave it for testing action executionClaimIds
        require(success, "GelatoUserProxy.executeCall(): _action.call failed");
    }

    function executeDelegatecall(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        payable
        auth
        noZeroAddress(address(_action))
        returns(bool success, bytes memory returndata)
    {
        (success, returndata) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );
        ///@dev we should delete require later - leave it for testing action executionClaimIds
        require(success, "GelatoUserProxy.executeDelegatecall(): _action.delegatecall failed");
    }

    function getUser() external view returns(address payable) {return user;}

    function getGelatoCore() external view returns(address payable) {return gelatoCore;}
}