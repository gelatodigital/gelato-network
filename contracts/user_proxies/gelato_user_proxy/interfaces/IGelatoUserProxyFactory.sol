pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoUserProxy } from "../GelatoUserProxy.sol";
import { Action, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxyFactory {
    event LogCreation(address indexed user, GelatoUserProxy indexed userProxy);

    // create
    function create(Task[] calldata _optionalMintTasks, Action[] calldata _setupActions)
        external
        payable
        returns(GelatoUserProxy userProxy);

    // ______ State Read APIs __________________
    function gelatoProxyByUser(address _user) external view returns(GelatoUserProxy);
    function userByGelatoProxy(GelatoUserProxy _proxy) external view returns(address);

    function isGelatoUserProxy(address _proxy) external view returns(bool);
    function isGelatoProxyUser(address _user) external view returns(bool);

    function gelatoCore() external pure returns(address);

    function proxyCreationCode() external pure returns(bytes memory);
    function proxyRuntimeCode() external pure returns(bytes memory);
    function proxyExtcodehash() external pure returns(bytes32);
}