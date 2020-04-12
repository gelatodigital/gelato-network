pragma solidity ^0.6.3;
pragma experimental ABIEncoderV2;

import { ScriptGnosisSafeEnableGelatoCore } from "../../user_proxies/gnosis_safe_proxy/scripts/ScriptGnosisSafeEnableGelatoCore.sol";
import { IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { ActionWithdrawBatchExchange } from "./ActionWithdrawBatchExchange.sol";
import { ActionPlaceOrderBatchExchange } from "./ActionPlaceOrderBatchExchange.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract ScriptEnterStableSwap is ActionPlaceOrderBatchExchange, ScriptGnosisSafeEnableGelatoCore {

    // struct Task {
    //     address provider;
    //     address providerModule;
    //     address condition;
    //     address action;
    //     bytes conditionPayload;
    //     bytes actionPayload;
    //     uint256 expiryDate;
    // }

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
        require(_task.condition.addr == address(0));

        // 1. Enable Gelato Core
        enableGelatoCoreModule(_gelatoCore);

        // 2. Execute Trade on BatchExchange
        action(
            _user,
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _orderExpirationBatchId
        );

        // 3. Mint execution claim
        bytes memory actionPayload = abi.encodeWithSignature(
            "action(address,address,address,address)",
            _user,
            address(this), //proxyAddress
            _sellToken,
            _buyToken
        );

        _task.actions[0].data = actionPayload;

        // Mint new Claim
        try IGelatoCore(_gelatoCore).mintExecClaim(_task) {
        } catch {
            revert("Minting chainedClaim unsuccessful");
        }

    }


}