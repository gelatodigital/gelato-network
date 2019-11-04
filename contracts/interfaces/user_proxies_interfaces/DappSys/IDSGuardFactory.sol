pragma solidity ^0.5.10;

import "../../../user_proxies/DappSys/DSGuard.sol";

interface IDSGuardFactory {
    function isGuard(address) external view returns(bool);
    function newGuard() external returns (DSGuard);
}