// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import {IGelatoCore, TaskReceipt} from '../gelato_core/interfaces/IGelatoCore.sol';


/// @title GelatoMulticall - Aggregate results from multiple read-only function calls on GelatoCore
/// @author Hilmar X (inspired by Maker's Multicall)

contract GelatoMulticall {

    IGelatoCore public immutable gelatoCore;

    constructor(IGelatoCore _gelatoCore) public {
        gelatoCore = _gelatoCore;
    }

    struct Reponse {
        uint256 id;
        string response;
    }


    function multiCanExec(
        TaskReceipt[] memory _TR,
        uint256 _gelatoMaxGas,
        uint256 _gelatoGasPrice
    )
        public view returns (uint256 blockNumber, Reponse[] memory returnData)

    {
        blockNumber = block.number;
        returnData = new Reponse[](_TR.length);
        for(uint256 i = 0; i < _TR.length; i++) {
            try gelatoCore.canExec(_TR[i], _gelatoMaxGas, _gelatoGasPrice)
            returns(string memory response)
            {
                returnData[i] = Reponse({id: _TR[i].id, response: response});
            }
            catch {
                returnData[i] = Reponse({id: _TR[i].id, response: "Multicall.multiCanExec: failed"});
            }
        }
    }
}