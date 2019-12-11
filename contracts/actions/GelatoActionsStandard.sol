pragma solidity ^0.5.14;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
contract GelatoActionsStandard is IGelatoAction {

    address constant internal gelatoCore = 0x86CcCd81e00E5164b76Ef632EF79a987A4ACE938;

    event LogAction(address indexed user);

    // Non-deployable contract
    constructor() internal {}

    function getGelatoCore() external pure returns(address) {return gelatoCore;}

    function actionConditionsOk(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        returns(bool)
    {
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
