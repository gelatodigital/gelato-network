pragma solidity ^0.5.10;

contract KyberEncoder
{
    function abiEncodeTriggerParam(address _src,
                                   address _dest,
                                   uint256 _srcAmt,
                                   bool isGreater,
                                   uint256 _buyAmount
    )
        external
        pure
        returns (bytes memory payload)
    {
        payload = abi.encode(_src, _dest, _srcAmt, isGreater, _buyAmount);
    }

    function abiEncodeActionParam(address _src,
                                  address _dest,
                                  uint256 _srcAmt,
                                  uint256 _minConversionRate
    )
        external
        pure
        returns (bytes memory payload)
    {
        payload = abi.encode(_src, _dest, _srcAmt, _minConversionRate);
    }
}