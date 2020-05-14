pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxyFactory } from "./interfaces/IGelatoUserProxyFactory.sol";
import { Address } from "../../external/Address.sol";
import { GelatoUserProxy } from "./GelatoUserProxy.sol";
import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    using Address for address payable;  /// for oz's sendValue method

    address public immutable override gelatoCore;

    mapping(address => GelatoUserProxy) public override gelatoProxyByUser;
    mapping(GelatoUserProxy => address) public override userByGelatoProxy;

    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    // create: public due to UnimplementedFeatureError structs
    function create(
        Action[] memory _actions,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = new GelatoUserProxy{value: msg.value}(msg.sender, gelatoCore);
        gelatoProxyByUser[msg.sender] = userProxy;
        userByGelatoProxy[userProxy] = msg.sender;
        if (_actions.length != 0) _execActions(userProxy, _actions);
        if (_tasks.length != 0) _submitTasks(userProxy, _tasks, _expiryDates);
        emit LogCreation(msg.sender, userProxy, msg.value);
    }

    // A standard _saltNonce can be used for deterministic shared address derivation
    function createTwo(
        uint256 _saltNonce,
        Action[] memory _actions,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
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
        if (_tasks.length != 0) _submitTasks(userProxy, _tasks, _expiryDates);

        // Success
        emit LogCreation(msg.sender, userProxy, msg.value);
    }

    function createAndSubmitTaskCycle(
        Action[] memory _actions,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = create(_actions, new Task[](0), new uint[](0));
        if (_tasks.length != 0) _submitTaskCycle(userProxy, _tasks, _cycles, _expiryDate);
    }

    function createTwoAndSubmitTaskCycle(
        uint256 _saltNonce,
        Action[] memory _actions,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = createTwo(_saltNonce, _actions, new Task[](0), new uint[](0));
        if (_tasks.length != 0) _submitTaskCycle(userProxy, _tasks, _cycles, _expiryDate);
    }

    function createAndSubmitTaskChain(
        Action[] memory _actions,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = create(_actions, new Task[](0), new uint[](0));
        if (_tasks.length != 0) _submitTaskChain(userProxy, _tasks, _sumOfRequestedTaskSubmits, _expiryDate);
    }

    function createTwoAndSubmitTaskChain(
        uint256 _saltNonce,
        Action[] memory _actions,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = createTwo(_saltNonce, _actions, new Task[](0), new uint[](0));
        if (_tasks.length != 0) _submitTaskChain(userProxy, _tasks, _cycles, _expiryDate);
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
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        private
    {
        try _userProxy.multiSubmitTasks(_tasks, _expiryDates) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxyFactory._submitTasks:", err)));
        } catch {
            revert("GelatoUserProxyFactory._submitTasks:undefined");
        }
    }

    function _submitTaskCycle(
        GelatoUserProxy _userProxy,
        Task[] memory _tasks,
        uint256 _cycles,
        uint256 _expiryDate
    )
        private
    {
        try _userProxy.submitTaskCycle(_tasks, _cycles, _expiryDate) {
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
        Task[] memory _tasks,
        uint256 _sumOfRequestedTaskSubmits,
        uint256 _expiryDate
    )
        private
    {
        try _userProxy.submitTaskChain(_tasks, _sumOfRequestedTaskSubmits, _expiryDate) {
        } catch Error(string memory err) {
            revert(
                string(abi.encodePacked("GelatoUserProxyFactory._submitTaskCycle:", err))
            );
        } catch {
            revert("GelatoUserProxyFactory._submitTaskCycle:undefined");
        }
    }
}