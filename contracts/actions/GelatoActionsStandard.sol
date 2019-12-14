pragma solidity ^0.5.14;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
contract GelatoActionsStandard is IGelatoAction {

    address constant internal gelatoCore = 0x43c7a05290797a25B2E3D4fDE7c504333EbE2428;

    event LogAction(address indexed user);

    // Non-deployable contract
    constructor() internal {}

    // To be overriden by deriving contracts
    modifier actionGasCheck {_;}

    function getGelatoCore() external pure returns(address) {return gelatoCore;}

    function actionConditionsOk(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        returns(bool)
    {
        // solhint-disable-next-line
        this;  // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return true;
    }

    function getProxyOfUser(address payable _user)
        external
        view
        returns(IGelatoUserProxy)
    {
        return _getProxyOfUser(_user);
    }

    function _getProxyOfUser(address _user)
        internal
        view
        returns(IGelatoUserProxy)
    {
        return IGelatoUserProxyManager(gelatoCore).getProxyOfUser(_user);
    }
}
