// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxyFactory } from "./interfaces/IGelatoUserProxyFactory.sol";
import { Address } from "../../external/Address.sol";
import { GelatoUserProxy } from "./GelatoUserProxy.sol";
import { GelatoUserProxySet } from "../../libraries/GelatoUserProxySet.sol";
import { Action, Provider, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    using Address for address payable;  /// for oz's sendValue method
    using GelatoUserProxySet for GelatoUserProxySet.Set;

    address public immutable override gelatoCore;

    mapping(GelatoUserProxy => address) public override userByGelatoProxy;
    mapping(address => GelatoUserProxySet.Set) private _gelatoProxiesByUser;

    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    //  ==================== CREATE =======================================
    function create() public payable override returns (GelatoUserProxy userProxy) {
        userProxy = new GelatoUserProxy{value: msg.value}(msg.sender, gelatoCore);
        _storeGelatoUserProxy(userProxy);
    }

    function createExecActions(Action[] memory _actions)
        public
        payable
        override
        returns (GelatoUserProxy userProxy)
    {
        userProxy = create();
        if (_actions.length != 0) _execActions(userProxy, _actions);
    }

    function createSubmitTasks(
        Provider memory _provider,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        public
        payable
        override
        returns (GelatoUserProxy userProxy)
    {
        userProxy = create();
        if (_tasks.length != 0) _submitTasks(userProxy, _provider, _tasks, _expiryDates);
    }

    function createExecActionsSubmitTasks(
        Action[] memory _actions,
        Provider memory _provider,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = create();
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_tasks.length != 0) _submitTasks(userProxy, _provider, _tasks, _expiryDates);
    }

    function createExecActionsSubmitTaskCycle(
        Action[] memory _actions,
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = create();
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_tasks.length == 0)
            revert("GelatoUserProxyFactory.createExecActionsSubmitTaskCycle: 0 _tasks");
        _submitTaskCycle(userProxy, _provider, _tasks, _expiryDate, _cycles);
    }

    function createExecActionsSubmitTaskChain(
        Action[] memory _actions,
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = create();
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_tasks.length == 0)
            revert("GelatoUserProxyFactory.createExecActionsSubmitTaskChain: 0 _tasks");
        _submitTaskChain(userProxy, _provider, _tasks, _expiryDate, _sumOfRequestedTaskSubmits);
    }

    //  ==================== CREATE 2 =======================================
    function createTwo(uint256 _saltNonce)
        public
        payable
        override
        returns (GelatoUserProxy userProxy)
    {
        bytes32 salt = keccak256(abi.encode(msg.sender, _saltNonce));
        userProxy = new GelatoUserProxy{salt: salt, value: msg.value}(msg.sender, gelatoCore);
        require(
            address(userProxy) == predictProxyAddress(msg.sender, _saltNonce),
            "GelatoUserProxyFactory.createTwo: wrong address prediction"
        );
        _storeGelatoUserProxy(userProxy);
    }

    function createTwoExecActions(uint256 _saltNonce, Action[] memory _actions)
        public
        payable
        override
        returns (GelatoUserProxy userProxy)
    {
        userProxy = createTwo(_saltNonce);
        if (_actions.length != 0) _execActions(userProxy, _actions);
    }

    function createTwoSubmitTasks(
        uint256 _saltNonce,
        // Submit Tasks Data
        Provider memory _provider,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        public
        payable
        override
        returns (GelatoUserProxy userProxy)
    {
        userProxy = createTwo(_saltNonce);
        if (_tasks.length != 0) _submitTasks(userProxy, _provider, _tasks, _expiryDates);
    }

    // A standard _saltNonce can be used for deterministic shared address derivation
    function createTwoExecActionsSubmitTasks(
        uint256 _saltNonce,
        Action[] memory _actions,
        // Submit Tasks Data
        Provider memory _provider,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = createTwo(_saltNonce);
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_tasks.length != 0) _submitTasks(userProxy, _provider, _tasks, _expiryDates);
    }

    function createTwoExecActionsSubmitTaskCycle(
        uint256 _saltNonce,
        Action[] memory _actions,
        // Submit TaskCycle Data
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = createTwo(_saltNonce);
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_tasks.length == 0)
            revert("GelatoUserProxyFactory.createTwoExecActionsSubmitTaskCycle: 0 _tasks");
        _submitTaskCycle(userProxy, _provider, _tasks, _expiryDate, _cycles);
    }

    function createTwoExecActionsSubmitTaskChain(
        uint256 _saltNonce,
        Action[] memory _actions,
        // Submit TaskChain Data
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = createTwo(_saltNonce);
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_tasks.length == 0)
            revert("GelatoUserProxyFactory.createTwoExecActionsSubmitTaskChain: 0 _tasks");
        _submitTaskChain(userProxy, _provider, _tasks, _expiryDate, _cycles);
    }

    //  ==================== GETTERS =======================================
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

    function isGelatoProxyUser(address _user, GelatoUserProxy _userProxy)
        public
        view
        override
        returns(bool)
    {
        return _gelatoProxiesByUser[_user].contains(_userProxy);
    }

    function gelatoProxiesByUser(address _user)
        public
        view
        override
        returns(GelatoUserProxy[] memory)
    {
        return _gelatoProxiesByUser[_user].enumerate();
    }

    function getGelatoUserProxyByIndex(address _user, uint256 _index)
        public
        view
        override
        returns(GelatoUserProxy)
    {
        return _gelatoProxiesByUser[_user].get(_index);
    }

    function proxyCreationCode() public pure override returns(bytes memory) {
        return type(GelatoUserProxy).creationCode;
    }

    //  ==================== HELPERS =======================================
    // store and emit LogCreation
    function _storeGelatoUserProxy(GelatoUserProxy _userProxy) private {
        _gelatoProxiesByUser[msg.sender].add(_userProxy);
        userByGelatoProxy[_userProxy] = msg.sender;
        emit LogCreation(msg.sender, _userProxy, msg.value);
    }

    function _execActions(GelatoUserProxy _userProxy, Action[] memory _actions) private {
        try _userProxy.multiExecActions(_actions) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxyFactory._execActions:", err)));
        } catch {
            revert("GelatoUserProxyFactory._execActions:undefined");
        }
    }

    function _submitTasks(
        GelatoUserProxy _userProxy,
        // Submit Tasks Data
        Provider memory _provider,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        private
    {
        try _userProxy.multiSubmitTasks(_provider, _tasks, _expiryDates) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxyFactory._submitTasks:", err)));
        } catch {
            revert("GelatoUserProxyFactory._submitTasks:undefined");
        }
    }

    function _submitTaskCycle(
        GelatoUserProxy _userProxy,
        // Submit TaskCyle Data
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        private
    {
        try _userProxy.submitTaskCycle(_provider, _tasks, _expiryDate, _cycles) {
        } catch Error(string memory err) {
            revert(
                string(abi.encodePacked("GelatoUserProxyFactory._submitTaskCycle:", err))
            );
        } catch {
            revert("GelatoUserProxyFactory._submitTaskCycle:undefined");
        }
    }

    function _submitTaskChain(
        GelatoUserProxy _userProxy,
        // Submit TaskChain Data
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits
    )
        private
    {
        try _userProxy.submitTaskChain(
            _provider,
            _tasks,
            _expiryDate,
            _sumOfRequestedTaskSubmits
        ) {
        } catch Error(string memory err) {
            revert(
                string(abi.encodePacked("GelatoUserProxyFactory._submitTaskCycle:", err))
            );
        } catch {
            revert("GelatoUserProxyFactory._submitTaskCycle:undefined");
        }
    }
}
