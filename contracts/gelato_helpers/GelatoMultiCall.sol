// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IGelatoCore, TaskReceipt} from "../gelato_core/interfaces/IGelatoCore.sol";
import {IGelatoSysAdmin} from "../gelato_core/interfaces/IGelatoSysAdmin.sol";
import {GelatoTaskReceipt} from "../libraries/GelatoTaskReceipt.sol";
import {GelatoString} from "../libraries/GelatoString.sol";

/// @title GelatoMultiCall - Aggregate results from multiple read-only function calls on GelatoCore
/// @author Hilmar X & gitpusha (inspired by Maker's Multicall)
contract GelatoMultiCall {

    using GelatoTaskReceipt for TaskReceipt;
    using GelatoString for string;

    struct Reponse { uint256 taskReceiptId; string response; }

    address public immutable gelatoCore;
    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    function multiCanExec(
        TaskReceipt[] memory _TR,
        uint256 _gasLimit,
        uint256 _gelatoGasPrice
    )
        public
        view
        virtual
        returns (uint256 blockNumber, Reponse[] memory responses)
    {
        blockNumber = block.number;
        responses = new Reponse[](_TR.length);
        for(uint256 i = 0; i < _TR.length; i++) {
            try IGelatoCore(gelatoCore).canExec(_TR[i], _gasLimit, _gelatoGasPrice)
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

    function getGasLimit(TaskReceipt memory _TR) private view returns (uint256) {
        if (_TR.selfProvider()) return _TR.task().selfProviderGasLimit;
        return IGelatoSysAdmin(gelatoCore).gelatoMaxGas();
    }

}