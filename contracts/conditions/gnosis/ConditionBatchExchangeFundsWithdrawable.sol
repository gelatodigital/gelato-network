pragma solidity ^0.6.2;

import "../IGelatoCondition.sol";
import "../../external/IERC20.sol";
import "../../dapp_interfaces/gnosis/IBatchExchange.sol";

contract ConditionBatchExchangeFundsWithdrawable is IGelatoCondition {


    IBatchExchange private constant batchExchange = IBatchExchange(0xC576eA7bd102F7E476368a5E98FA455d1Ea34dE2);

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() public pure override returns(bytes4) {
        return this.reached.selector;
    }

    function reached(
        address _proxy,
        address _sellToken,
        address _buyToken
    )
        external
        view
        returns(bool, string memory)  // executable?, reason
    {
        (bool sellTokenWithdrawable, bool buyTokenWithdrawable) = getConditionValue(_proxy, _sellToken, _buyToken);

        if (!sellTokenWithdrawable) {
            return (false, "1");
        }

        if (!buyTokenWithdrawable) {
            return (false, "2");
        }

        return (true, "0");

    }

    function getConditionValue(
        address _proxy,
        address _sellToken,
        address _buyToken
    )
        public
        view
        returns(bool, bool)
    {
        bool sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_proxy, _sellToken);
        bool buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_proxy, _buyToken);
        return (sellTokenWithdrawable, buyTokenWithdrawable);
    }
}