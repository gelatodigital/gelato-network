// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import "../GelatoConditionsStandard.sol";
import "../../dapp_interfaces/gnosis/IBatchExchange.sol";

contract ConditionBatchExchangeFundsWithdrawable is GelatoConditionsStandard {

    address public immutable batchExchangeAddress;
    constructor(address _batchExchange) public { batchExchangeAddress = _batchExchange; }

    function ok(bytes calldata _conditionDataWithSelector)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (address proxy, address sellToken, address buyToken) = abi.decode(
            _conditionDataWithSelector[4:],
            (address,address,address)
        );
        return ok(proxy, sellToken, buyToken);
    }

    function ok(address _proxy, address _sellToken, address _buyToken)
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
        address _sellToken,
        address _buyToken
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