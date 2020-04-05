pragma solidity ^0.6.3;
pragma experimental ABIEncoderV2;

import { ScriptGnosisSafeEnableGelatoCore } from "../../user_proxies/gnosis_safe_proxy/scripts/ScriptGnosisSafeEnableGelatoCore.sol";
import { IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { ActionWithdrawBatchExchangeRinkeby } from "./ActionWithdrawBatchExchangeRinkeby.sol";
import { ActionPlaceOrderBatchExchange } from "./ActionPlaceOrderBatchExchange.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { ExecClaim, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract ScriptEnterStableSwap is ActionPlaceOrderBatchExchange, ScriptGnosisSafeEnableGelatoCore {

    // struct ExecClaim {
    //     uint256 id;
    //     address provider;
    //     address providerModule;
    //     address userProxy;
    //     address condition;
    //     address action;
    //     bytes conditionPayload;
    //     bytes actionPayload;
    //     uint256 expiryDate;
    // }

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
        ExecClaim memory _execClaim
    )
        public
    {
        require(_execClaim.condition == address(0));

        // 1. Enable Gelato Core
        enableGelatoCoreModule(address(gelatoCore));

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

        _execClaim.userProxy = address(this);
        _execClaim.actionPayload = actionPayload;

        // Mint new Claim
        try gelatoCore.mintExecClaim(_execClaim) {
        } catch {
            revert("Minting chainedClaim unsuccessful");
        }

    }


}