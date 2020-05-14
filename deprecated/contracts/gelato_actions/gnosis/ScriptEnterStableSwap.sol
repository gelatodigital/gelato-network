pragma solidity ^0.6.3;
pragma experimental ABIEncoderV2;

import { ScriptGnosisSafeEnableGelatoCore } from "../../../contracts/user_proxies/gnosis_safe_proxy/scripts/ScriptGnosisSafeEnableGelatoCore.sol";
import { IGelatoCore } from "../../../contracts/gelato_core/interfaces/IGelatoCore.sol";
import { ActionWithdrawBatchExchangeOld } from "./ActionWithdrawBatchExchangeOld.sol";
import { ActionPlaceOrderBatchExchange } from "../../../contracts/gelato_actions/gnosis/ActionPlaceOrderBatchExchange.sol";
import { IBatchExchange } from "../../../contracts/dapp_interfaces/gnosis/IBatchExchange.sol";
import { Task, IGelatoCore } from "../../../contracts/gelato_core/interfaces/IGelatoCore.sol";
import { FeeExtractor } from "../../../contracts/gelato_helpers/FeeExtractor.sol";


/// @title ScriptEnterStableSwap
/// @author Luis Schliesske & Hilmar Orth
/// @notice Script that 1) whitelists gelato core as gnosis safe module, 2) places order on batch exchange and submits two withdraw requests and 3) submits Task on gelato for a withdraw action
contract ScriptEnterStableSwap is ActionPlaceOrderBatchExchange, ScriptGnosisSafeEnableGelatoCore {

    constructor(address _batchExchange, address _feeExtractor) ActionPlaceOrderBatchExchange(_batchExchange, _feeExtractor) public {}

    /// @notice Place order on Batch Exchange and request future withdraw for buy and sell token
    /// @dev Only delegate call into this script
    /// @param _user Users EOA address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyAmount Amount to receive (at least)
    /// @param _orderExpirationBatchId Expiration batch id of order and id used to request withdrawals for
    /// @param _gelatoCore Address of gelatoCore
    /// @param _task Task which will be submitted on gelato (ActionWithdrawFromBatchExchange)
    function enterStableSwap(
        address _user,
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint128 _buyAmount,
        uint32 _orderExpirationBatchId,
        address _gelatoCore,
        // ChainedSubmissionParams
        Task memory _task
    )
        public
    {
        // 1. Enable Gelato Core
        enableGelatoCoreModule(_gelatoCore);

        // 2. Execute Trade on BatchExchange
        action(
            _user,
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _orderExpirationBatchId,
            _gelatoCore,
            _task
        );

    }


}