pragma solidity ^0.6.6;

import { GelatoUserProxy } from "./GelatoUserProxy.sol";

interface IGelatoUserProxyFactory {
    event LogCreation(address indexed user, GelatoUserProxy indexed userProxy);

    // create & create2
    function create() external payable returns(GelatoUserProxy userProxy);
    function createTwo(uint256 _saltNonce) external payable returns(GelatoUserProxy userProxy);

    // ______ State Read APIs __________________
    function gelatoCore() external view returns (address);
    function gelatoProxyByUser(address _user) external view returns (GelatoUserProxy);
    function predictProxyAddress(address _user, uint256 _saltNonce)
        external
        view
        returns(address);
    function proxyCreationCode() external pure returns(bytes memory);
    function proxyRuntimeCode() external pure returns(bytes memory);
    function proxyExtcodehash() external pure returns(bytes32);
}