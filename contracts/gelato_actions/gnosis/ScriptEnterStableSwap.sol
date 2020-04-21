pragma solidity ^0.6.3;
pragma experimental ABIEncoderV2;

import { ScriptGnosisSafeEnableGelatoCore } from "../../user_proxies/gnosis_safe_proxy/scripts/ScriptGnosisSafeEnableGelatoCore.sol";
import { IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { ActionWithdrawBatchExchange } from "./ActionWithdrawBatchExchange.sol";
import { ActionPlaceOrderBatchExchange } from "./ActionPlaceOrderBatchExchange.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract ScriptEnterStableSwap is ActionPlaceOrderBatchExchange, ScriptGnosisSafeEnableGelatoCore {

    constructor(address _batchExchange) ActionPlaceOrderBatchExchange(_batchExchange) public {
    }

    function enterStableSwap(
        address _user,
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint128 _buyAmount,
        uint32 _orderExpirationBatchId,
        address _gelatoCore,
        // ChainedMintingParams
        Task memory _task
    )
        public
    {
        // 1. Enable Gelato Core
        enableGelatoCoreModule(_gelatoCore);

        // 2. Execute Trade on BatchExchange
        action(
            _user,
            address(this),
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _orderExpirationBatchId
        );

        // 3. Mint execution claim
        try IGelatoCore(_gelatoCore).mintExecClaim(_task) {
        } catch {
            revert("Minting chainedClaim unsuccessful");
        }

    }


}