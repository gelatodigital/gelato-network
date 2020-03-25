pragma solidity ^0.6.3;

import "./ActionWithdrawBatchExchangeRinkeby.sol";
import "./ActionPlaceOrderBatchExchange.sol";
import "../../conditions/gnosis/ConditionBatchExchangeFundsWithdrawable.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";

contract ScriptEnterStableSwap is ActionPlaceOrderBatchExchange, ConditionBatchExchangeFundsWithdrawable {

    // Gelato Core
    IGelatoCore private constant gelatoCore = IGelatoCore(
        0xff54516a7bC1c1ea952A688E72d5B93a80620074)
    ;

    // BatchExchange
    IBatchExchange private constant batchExchange = IBatchExchange(0xC576eA7bd102F7E476368a5E98FA455d1Ea34dE2);

    function enterStableSwap(
        address _user,
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint128 _buyAmount,
        uint32 _orderExpirationBatchId,
        // ChainedMintingParams
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction
    )
        external
    {
        // 1. Execute Trade on BatchExchange
        placeOrderRequestWithdraw(
            _user,
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _orderExpirationBatchId
        );

        // 2. Mint execution claim
        bytes memory conditionPayload = abi.encodeWithSelector(conditionSelector(), address(this), _sellToken, _buyToken);
        bytes memory actionPayload = abi.encodeWithSignature(
            "withdrawFromBatchExchange(address,address,address)",
            _user,
            _sellToken,
            _buyToken
         );

        /*
        bytes4(keccak256("withdrawFromBatchExchange(address,address,address)")),
        _user,
        _sellToken,
        _buyToken
        */


        // Mint new Claim
        try gelatoCore.mintExecutionClaim(
            _selectedProviderAndExecutor,
            _conditionAndAction,
            conditionPayload,
            actionPayload,
            0  // executionClaimExpiryDate defaults to executor's max allowance
        ) {
        } catch {
            revert("Minting chainedClaim unsuccessful");
        }

    }


}