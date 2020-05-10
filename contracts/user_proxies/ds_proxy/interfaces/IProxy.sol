pragma solidity >=0.5.0 <0.6.7;

import { DSAuthority } from "../Auth.sol";

interface IDSProxy {

    function execute(address _target, bytes calldata _data)
        external
        returns (bytes memory response);

    function authority()
        external
        view
        returns (DSAuthority);
}