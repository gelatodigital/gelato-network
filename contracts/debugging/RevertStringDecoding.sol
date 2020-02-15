pragma solidity ^0.6.2;

import "@nomiclabs/buidler/Console.sol";

contract Action {
    function revertMessage() external pure {
        revert("Success: I am the revert message");
    }
}

contract UserProxy {
    function delegatecallGelatoAction(Action _action)
        external
        payable
    {
        bytes memory payload = abi.encodeWithSelector(_action.revertMessage.selector);
        (bool success, bytes memory revertReason) = address(_action).delegatecall(payload);
        console.log("Unmodified revertReason bytes");
        console.logBytes(revertReason);
        assembly {
            revertReason := add(revertReason, 68)
        }
        console.log("String decoded revertReason bytes");
        console.logBytes(revertReason);
        if (!success) revert(string(revertReason));
    }
}

contract Core {
    function catchErrorString(UserProxy _userGnosisSafeProxy, Action _action) external {
        try _userGnosisSafeProxy.delegatecallGelatoAction(_action) {
            console.log("Failed: Should have reverted!");
        } catch Error(string memory revertReason) {
            console.log(revertReason);
        } catch {
            console.log("Failed: Error during Error string decoding");
        }
    }
}
