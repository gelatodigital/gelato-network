pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";


contract GelatoExecutionClaim is ERC721Full {
    constructor(string memory name, string memory symbol)
        ERC721Full(name, symbol)
        internal
{}
}