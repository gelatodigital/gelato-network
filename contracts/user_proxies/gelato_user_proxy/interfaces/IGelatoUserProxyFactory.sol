pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoUserProxy } from "../GelatoUserProxy.sol";
import { Action, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxyFactory {
    event LogCreation(address indexed user, GelatoUserProxy indexed userProxy);

    // create

    /// @notice Create gelato user proxy
    /// @param _optionalCreateTasks Optional tasks to create on gelato
    /// @param _setupActions Optional actions to execute
    /// @return userProxy address of deployed proxy contract
    function create(Task[] calldata _optionalCreateTasks, Action[] calldata _setupActions)
        external
        payable
        returns(GelatoUserProxy userProxy);

    // ______ State Read APIs __________________

    /// @notice Get address of proxy contract from user address (EOA)
    /// @param _user Address of user (EOA)
    /// @return Proxy contract address
    function gelatoProxyByUser(address _user) external view returns(GelatoUserProxy);

    /// @notice Get address of user (EOA) from proxy contract address
    /// @param _proxy Address of proxy contract
    /// @return User (EOA) address
    function userByGelatoProxy(GelatoUserProxy _proxy) external view returns(address);

    /// @notice Check if proxy was deployed from gelato proxy factory
    /// @param _proxy Address of proxy contract
    /// @return true if it was deployed from gelato user proxy factory
    function isGelatoUserProxy(address _proxy) external view returns(bool);

    /// @notice Check if user has deployed a proxy from gelato proxy factory
    /// @param _user Address of user contract
    /// @return true if user deployed a proxy from gelato user proxy factory
    function isGelatoProxyUser(address _user) external view returns(bool);

    /// @notice Returns address of gelato
    /// @return Gelato core address
    function gelatoCore() external pure returns(address);
}