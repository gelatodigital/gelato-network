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
    //     uint256 id;  // set automatically by mintExecClaim
    //     address provider;   //  if msg.sender == provider => self-Provider
    //     address providerModule;  //  can be AddressZero for self-Providers
    //     address userProxy;  // set automatically to msg.sender by mintExecClaim
    //     address condition;   // can be AddressZero for self-conditional Actions
    //     address action;
    //     bytes conditionPayload;  // can be bytes32(0) for self-conditional Actions
    //     bytes actionPayload;
    //     uint256 expiryDate;  // subject to rent payments; 0 == infinity.
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
        bytes memory conditionPayload;
        bytes memory actionPayload = abi.encodeWithSignature(
            "action(address,address,address)",
            _user,
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