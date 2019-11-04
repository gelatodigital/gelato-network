pragma solidity ^0.5.10;

import "../../../user_proxies/DappSys/DSProxy.sol";

interface IDSProxy {
    event LogSetAuthority (address indexed authority);
    event LogSetOwner     (address indexed owner);
    function authority() external view returns(DSAuthority);
    function owner() external view returns(address);
    function setOwner(address) external;
    function setAuthority(DSAuthority) external;
    function canCall(address, address, bytes4) external view returns (bool);

    event LogNote(
        bytes4   indexed  sig,
        address  indexed  guy,
        bytes32  indexed  foo,
        bytes32  indexed  bar,
        uint256           wad,
        bytes             fax
    ) anonymous;

    function cache() external view returns(DSProxyCache);
    // use the proxy to execute calldata _data on contract _code
    function execute(bytes calldata, bytes calldata)
        external
        payable
        returns (address, bytes memory);
    function execute(address, bytes calldata)
        external
        payable
        returns (bytes memory);
    function setCache(address) external returns (bool);
}
