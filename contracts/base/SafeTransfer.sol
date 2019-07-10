pragma solidity ^0.5.0;

import "@gnosis.pm/util-contracts/contracts/Token.sol";

interface BadToken {
    function transfer(address to, uint value) external;
    function transferFrom(address from, address to, uint value) external;
}

contract SafeTransfer {
    function safeTransfer(address token, address to, uint value, bool from) internal returns (bool result) {
        if (from) {
            BadToken(token).transferFrom(msg.sender, address(this), value);
        } else {
            BadToken(token).transfer(to, value);
        }

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            switch returndatasize
                case 0 {
                    // This is our BadToken
                    result := not(0) // result is true
                }
                case 32 {
                    // This is our GoodToken
                    returndatacopy(0, 0, 32)
                    result := mload(0) // result == returndata of external call
                }
                default {
                    // This is not an ERC20 token
                    result := 0
                }
        }
        return result;
    }
}