// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IGelatoCore, TaskReceipt} from "../gelato_core/interfaces/IGelatoCore.sol";
import {GelatoTaskReceipt} from "../libraries/GelatoTaskReceipt.sol";

/// @title GelatoMultiCall - Aggregate results from multiple read-only function calls on GelatoCore
/// @author Hilmar X (inspired by Maker's Multicall)
contract GelatoMultiCall {

    using GelatoTaskReceipt for TaskReceipt;

    IGelatoCore public immutable gelatoCore;

    constructor(IGelatoCore _gelatoCore) public { gelatoCore = _gelatoCore; }

    struct Reponse { uint256 taskReceiptId; string response; }

    function multiCanExec(
        TaskReceipt[] memory _TR,
        uint256 _gelatoMaxGas,
        uint256 _gelatoGasPrice
    )
        public
        view
        returns (uint256 blockNumber, Reponse[] memory responses)
    {
        blockNumber = block.number;
        responses = new Reponse[](_TR.length);
        for(uint256 i = 0; i < _TR.length; i++) {
            try gelatoCore.canExec(_TR[i], getGasLimit(_TR[i], _gelatoMaxGas), _gelatoGasPrice)
                returns(string memory response)
            {
                responses[i] = Reponse({taskReceiptId: _TR[i].id, response: response});
            } catch {
                responses[i] = Reponse({
                    taskReceiptId: _TR[i].id,
                    response: "GelatoMultiCall.multiCanExec: failed"
                });
            }
        }
    }

    function getGasLimit(TaskReceipt memory _TR, uint256 _gelatoMaxGas)
        private
        pure
        returns(uint256 gasLimit)
    {
        gasLimit = _TR.selfProvider() ? _TR.task().selfProviderGasLimit : _gelatoMaxGas;
    }

}