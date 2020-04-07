pragma solidity ^0.6.4;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";
import { SafeERC20 } from "../../../external/SafeERC20.sol";
import { IERC20 } from "../../../external/IERC20.sol";

contract MockBatchExchange is GelatoActionsStandard {

    using SafeERC20 for IERC20;

    mapping(address => uint256) public withdrawAmounts;

    function action(bytes calldata) external payable override virtual {
    }

    function withdraw(address _proxyAddress, address _token)
        public
    {
        IERC20 token = IERC20(_token);
        uint256 withdrawAmount = withdrawAmounts[_token];
        token.safeTransfer(_proxyAddress, withdrawAmount);
    }

    function setWithdrawAmount(address _token, uint256 _withdrawAmount)
        public
    {
        IERC20 token = IERC20(_token);
        require(token.balanceOf(address(this)) >= _withdrawAmount, "MockBatchExchange: Insufficient Token balance");
        withdrawAmounts[_token] = _withdrawAmount;
    }
}
