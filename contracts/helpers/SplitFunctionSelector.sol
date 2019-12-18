pragma solidity 0.6.0;

contract SplitFunctionSelector {
    // This contract should not be deployed
    constructor() internal {}

    function split(bytes memory _payloadWithSelector)
        public
        pure
        returns(bytes4 functionSelector, bytes memory payloadWithoutSelector)
    {
        assembly {
            // first 32bytes=0x20 stores length of bytes array - we take first 4 bytes
            functionSelector := mload(add(0x20, _payloadWithSelector))
            // mstore(p, v) => mem[p…(p+32)) := v
            mstore(
                add(_payloadWithSelector, 4),  // p shifted by 4 bytes
                sub(mload(_payloadWithSelector), 4)  // v (length of payload - 4)
            )
            payloadWithoutSelector := add(_payloadWithSelector, 4)
        }
    }
}
