pragma solidity ^0.5.10;

import "../../../user_proxies/DappSys/DSGuard.sol";

interface IDSGuard {
    event LogSetAuthority (address indexed authority);
    event LogSetOwner     (address indexed owner);
    function authority() external view returns(DSAuthority);
    function owner() external view returns(address);
    function setOwner(address) external;
    function setAuthority(DSAuthority) external;

    function canCall(address, address, bytes4) external view returns (bool);
    function permit(bytes32, bytes32, bytes32) external;
    function forbid(bytes32, bytes32, bytes32) external;

    function permit(address, address, bytes32) external;
    function forbid(address, address, bytes32) external;
}
