pragma solidity ^0.6.2;

import "@nomiclabs/buidler/console.sol";

contract ActionKyberTradePayloadDecoding {

    function decodePayload(bytes calldata actionKyberTradePayloadWithSelector)
        external
        view
    {
        this;
        (address _user,
         address _userProxy,
         address _sendToken,
         uint256 _sendAmt,
         address _receiveToken) = abi.decode(
             actionKyberTradePayloadWithSelector[4:],
             (address,address,address,uint256,address)
        );
        console.logAddress(_user);
        console.logAddress(_userProxy);
        console.logAddress(_sendToken);
        console.logUint(_sendAmt);
        console.logAddress(_receiveToken);
    }
}