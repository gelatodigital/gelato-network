pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxyFactory } from "./interfaces/IGelatoUserProxyFactory.sol";
import { Address } from "../../external/Address.sol";
import { StandaloneTaskSequence, GelatoUserProxy } from "./GelatoUserProxy.sol";
import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    using Address for address payable;  /// for oz's sendValue method

    address public immutable override gelatoCore;

    mapping(address => GelatoUserProxy) public override gelatoProxyByUser;
    mapping(GelatoUserProxy => address) public override userByGelatoProxy;

    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    // create: public due to UnimplementedFeatureError structs
    function create(Action[] memory _actions, StandaloneTaskSequence[] memory _standaloneTaskSequence)
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = new GelatoUserProxy{value: msg.value}(msg.sender, gelatoCore);
        gelatoProxyByUser[msg.sender] = userProxy;
        userByGelatoProxy[userProxy] = msg.sender;
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_standaloneTaskSequence.length != 0) _submitTasks(userProxy, _standaloneTaskSequence);
        emit LogCreation(msg.sender, userProxy, msg.value);
    }

    // A standard _saltNonce can be used for deterministic shared address derivation
    function createTwo(
        uint256 _saltNonce,
        Action[] memory _actions,
        StandaloneTaskSequence[] memory _standaloneTaskSequence
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        // Standard Way of deriving salt
        bytes32 salt = keccak256(abi.encode(msg.sender, _saltNonce));

        // Deploy userProxy with create2
        userProxy = new GelatoUserProxy{salt: salt, value: msg.value}(msg.sender, gelatoCore);
        require(
            address(userProxy) == predictProxyAddress(msg.sender, _saltNonce),
            "GelatoUserProxyFactory.createTwo: wrong address prediction"
        );
        gelatoProxyByUser[msg.sender] = userProxy;
        userByGelatoProxy[userProxy] = msg.sender;

        // Optional setup
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_standaloneTaskSequence.length != 0) _submitTasks(userProxy, _standaloneTaskSequence);

        // Success
        emit LogCreation(msg.sender, userProxy, msg.value);
    }

    function predictProxyAddress(address _user, uint256 _saltNonce)
        public
        view
        override
        returns(address)
    {
        // Standard Way of deriving salt
        bytes32 salt = keccak256(abi.encode(_user, _saltNonce));

        // Derive undeployed userProxy address
        return address(uint(keccak256(abi.encodePacked(
            byte(0xff),
            address(this),
            salt,
            keccak256(abi.encodePacked(proxyCreationCode(), abi.encode(_user, gelatoCore)))
        ))));
    }

    function isGelatoUserProxy(address _proxy) public view override returns(bool) {
        return userByGelatoProxy[GelatoUserProxy(payable(_proxy))] != address(0);
    }

    function isGelatoProxyUser(address _user) public view override returns(bool) {
        return gelatoProxyByUser[_user] != GelatoUserProxy(0);
    }

    function proxyCreationCode() public pure override returns(bytes memory) {
        return type(GelatoUserProxy).creationCode;
    }

    function _submitTasks(
        GelatoUserProxy _userProxy,
        StandaloneTaskSequence[] memory _standaloneTaskSequences
    )
        private
    {
        if (_standaloneTaskSequences.length == 1) {
            try _userProxy.submitTask(
                _standaloneTaskSequences[0].taskSequence,
                _standaloneTaskSequences[0].countdown,
                _standaloneTaskSequences[0].expiryDate
            ) {
            } catch Error(string memory err) {
                revert(string(abi.encodePacked("GelatoUserProxyFactory.submitTaskCountdown:", err)));
            } catch {
                revert("GelatoUserProxyFactory.submitTaskCountdown:undefined");
            }
        } else {
            try _userProxy.multiSubmitTasks(_standaloneTaskSequences) {
            } catch Error(string memory err) {
                revert(
                    string(abi.encodePacked("GelatoUserProxyFactory.multiSubmitTasks:", err))
                );
            } catch {
                revert("GelatoUserProxyFactory.multiSubmitTasks:undefined");
            }
        }
    }

    function _execActions(GelatoUserProxy _userProxy, Action[] memory _actions) private {
        try _userProxy.multiExecActions(_actions) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxyFactory._execActions:", err)));
        } catch {
            revert("GelatoUserProxyFactory._execActions:undefined");
        }
    }
}