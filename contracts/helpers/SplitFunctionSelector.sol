pragma solidity ^0.5.10;

contract SplitFunctionSelector {
    // This contract should not be deployed
    constructor() internal {}

    function splitFunctionSelector(bytes memory _payloadWithSelector)
        internal
        pure
        returns(bytes4 functionSelector, bytes memory payloadWithoutSelector)
    {
        assembly {
            // Aim: We put the funcSelector on the stack to access it outside of assembly
            // How: Get the pointer of the payload in memory (== _payloadWithSelector)
            //   and add 32 bytes (==0x20 hex) to point to where the actual data of
            //   the function selector lies, skipping the length bit (always first
            //   32 bytes).
            // Bind this pointer to funcSelector, which when using it in solidity
            //  ignores the encoded data which comes directly after the first word
            //  (functionSelector == bytes4)
            // In short: Read the first 32 bytes by loading the word that starts at
            //  memory location _payloadWithSelector + 32 bytes (==0x20 hex) and bind
            //  to funcSelector
            functionSelector := mload(add(0x20, _payloadWithSelector))

            // Aim: Get rid of the funcSelector Data
            // How: Load the first word of the _payloadWithSelector array
            // (== length of the data) and subtract it by 4
            // Then store this updated length which got rid of the first 4 bytes
            //  (== funcSelector) at memory location outPayload + 4
            // Mstore: Store the word derived in the second parameter at the location
            //  specified by the first parameter
            // Q: Does sub(mload(outPayload), 4) update the word that stores the
            //  length of the data, which automatically prunes the first 4 bytes
            //   of the part that stores the data?
            mstore(
                // At position _payloadWithSelector + 4
                add(_payloadWithSelector, 4),
                // Load the first word of the payloadWithoutSelector bytes array == length
                //  of the bytes and deduct it by 4
                sub(mload(_payloadWithSelector), 4)
            )
            // Skip the first 4 bytes (function signature)
            // Overwrite outPayload by binding the memory pointer of outPayload + 4
            //   to key outPayload
            payloadWithoutSelector := add(_payloadWithSelector, 4)
        }
    }
}
