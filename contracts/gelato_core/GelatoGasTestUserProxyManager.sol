pragma solidity ^0.5.13;

import "./GelatoUserProxy.sol";
import "./interfaces/IGelatoGasTestUserProxyManager.sol";

contract GasTestUserProxy is GelatoUserProxy {

    constructor(address payable _user) public GelatoUserProxy(_user) {}

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
        uint256 startGas = gasleft();
        (success, returndata) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );
        revert(string(abi.encodePacked(startGas - gasleft())));
    }
}

contract GelatoGasTestUserProxyManager is IGelatoGasTestUserProxyManager {
    // non-deploy base contract
    constructor() internal {}

    mapping(address => address) internal userToGasTestProxy;
    mapping(address => address) internal gasTestProxyToUser;

    modifier isGasTestProxy(address _) {
        require(_isGasTestProxy(_), "GelatoGasTestUserProxyManager.isGasTestProxy");
        _;
    }

    function createGasTestUserProxy()
        external
        returns(address gasTestUserProxy)
    {
        gasTestUserProxy = address(new GasTestUserProxy(msg.sender));
        userToGasTestProxy[msg.sender] = gasTestUserProxy;
        gasTestProxyToUser[gasTestUserProxy] = msg.sender;
    }

    function getUserOfGasTestProxy(address _gasTestProxy)
        external
        view
        returns(address)
    {
        return gasTestProxyToUser[_gasTestProxy];
    }

    function getGasTestProxyOfUser(address _user)
        external
        view
        returns(address)
    {
        return userToGasTestProxy[_user];
    }

    function _isGasTestProxy(address _) private view returns(bool) {
        return gasTestProxyToUser[_] != address(0);
    }
}