// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import {GelatoActionsStandard} from "../../../../gelato_actions/GelatoActionsStandard.sol";
import {SafeERC20} from "../../../../external/SafeERC20.sol";
import {IERC20} from "../../../../external/IERC20.sol";

contract MockBatchExchange {

    using SafeERC20 for IERC20;

    event LogWithdrawRequest();
    event LogCounter();

    mapping(address => uint256) public withdrawAmounts;
    mapping(address => bool) public validWithdrawRequests;

    uint256 public counter;

    function withdraw(address _proxyAddress, address _token)
        public
    {
        IERC20 token = IERC20(_token);
        uint256 withdrawAmount = withdrawAmounts[_token];
        token.safeTransfer(_proxyAddress, withdrawAmount, "MockBatchExchange.withdraw");
    }

    function setWithdrawAmount(address _token, uint256 _withdrawAmount)
        public
    {
        IERC20 token = IERC20(_token);
        require(
            token.balanceOf(address(this)) >= _withdrawAmount,
            "MockBatchExchange: Insufficient Token balance"
        );
        withdrawAmounts[_token] = _withdrawAmount;
    }

    function hasValidWithdrawRequest(address _proxyAddress, address)
        view
        public
        returns(bool)
    {
        if (validWithdrawRequests[_proxyAddress]) return true;
    }

    function setValidWithdrawRequest(address _proxyAddress)
        public
    {
        validWithdrawRequests[_proxyAddress] = true;
        emit LogWithdrawRequest();
        counter++;
        if(counter == 1 ) emit LogCounter();
    }

    // buyTokenId, sellTokenId, withdrawBatchId, _buyAmount, sellAmount
    function placeOrder(uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 sellAmount)
        public
        returns (uint256)
    {

    }

    function deposit(address _sellToken, uint128 _sellAmount)
        public
    {
        IERC20 sellToken = IERC20(_sellToken);
        sellToken.safeTransferFrom(
            msg.sender, address(this), _sellAmount, "MockBatchExchange.deposit:"
        );
    }

    function requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        public
    {
    }

    function tokenAddressToIdMap(address _token)
        public
        view
        returns(uint16 test)
    {

    }


}
