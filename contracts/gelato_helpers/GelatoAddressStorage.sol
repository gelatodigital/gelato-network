// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {Ownable} from "../external/Ownable.sol";

/// @title GelatoAddressStorage - Returns most up to date addresses for the Gelato Ecosystem
/// @author Hilmar X
contract GelatoAddressStorage is Ownable {

    mapping(bytes32 => address) addressStorage;

    struct KeyValue {
        string key;
        address value;
    }

    event LogSetAddress(string indexed key, address indexed value);

    function getAddress(string memory _key)
        public
        view
        returns (address)
    {
        return addressStorage[keccak256(abi.encodePacked(_key))];
    }

    function batchGetAddress(string[] memory _keys)
        public
        view
        returns (KeyValue[] memory result)
    {
        result = new KeyValue[](_keys.length);
        for (uint256 i; i < _keys.length; i++) {
            result[i] = KeyValue({
                key: _keys[i],
                value: getAddress(_keys[i])
            });
        }
    }

    function setAddress(string memory _key, address _address)
        public
        onlyOwner
    {
        addressStorage[keccak256(abi.encodePacked(_key))] = _address;
        emit LogSetAddress(_key, _address);
    }

    function batchSetAddress(KeyValue[] memory _keyValue)
        public
        onlyOwner
    {
        for (uint256 i; i < _keyValue.length; i++) {
            addressStorage[keccak256(abi.encodePacked(_keyValue[i].key))] = _keyValue[i].value;
            emit LogSetAddress(_keyValue[i].key, _keyValue[i].value);
        }

    }

    function deleteAddress(string memory _key)
        public
        onlyOwner
    {
        delete addressStorage[keccak256(abi.encodePacked(_key))];
        emit LogSetAddress(_key, address(0));
    }

}