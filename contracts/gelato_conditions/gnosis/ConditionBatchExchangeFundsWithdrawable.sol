// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import "../GelatoConditionsStandard.sol";
import "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import {IERC20} from "../../external/IERC20.sol";

contract ConditionBatchExchangeFundsWithdrawable is GelatoConditionsStandard {

    address public immutable batchExchangeAddress;
    constructor(address _batchExchange) public { batchExchangeAddress = _batchExchange; }

    function ok(uint256, bytes calldata _withdrawableCheckData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        (address proxy, IERC20 sellToken, IERC20 buyToken) = abi.decode(
            _withdrawableCheckData,
            (address,IERC20,IERC20)
        );
        return withdrawableCheck(proxy, sellToken, buyToken);
    }

    function withdrawableCheck(address _proxy, IERC20 _sellToken, IERC20 _buyToken)
        public
        view
        virtual
        returns(string memory)  // executable?
    {
        (bool sellTokenWithdrawable, bool buyTokenWithdrawable) = getConditionValue(
            _proxy,
            _sellToken,
            _buyToken
        );
        if (!sellTokenWithdrawable) return "SellTokenNotWithdrawable";
        if (!buyTokenWithdrawable) return "BuyTokenNotWithdrawable";
        return OK;
    }

    function getConditionValue(
        address _proxy,
        IERC20 _sellToken,
        IERC20 _buyToken
    )
        public
        view
        returns(bool sellTokenWithdrawable, bool buyTokenWithdrawable)
    {
        IBatchExchange batchExchange = IBatchExchange(batchExchangeAddress);
        sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_proxy, _sellToken);
        buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_proxy, _buyToken);
    }
}