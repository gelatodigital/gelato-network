pragma solidity ^0.6.1;

import "@nomiclabs/buidler/console.sol";

contract ConditionKyberRatePayloadDecoding {

    function decodePayload(bytes calldata conditionKyberRatePayloadWithSelector)
        external
        view
    {
        this;
        (address _src,
         uint256 _srcAmt,
         address _dest,
         uint256 _refRate,
         bool _greaterElseSmaller) = abi.decode(
             conditionKyberRatePayloadWithSelector[4:],
             (address,uint256,address,uint256,bool)
        );
        console.logAddress(_src);
        console.logUint(_srcAmt);
        console.logAddress(_dest);
        console.logUint(_refRate);
        console.logBool(_greaterElseSmaller);
    }
}