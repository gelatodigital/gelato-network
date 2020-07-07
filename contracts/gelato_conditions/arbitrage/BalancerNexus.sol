// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IBalancer {
    // probably has to be done with calcOutGivenIn instead of this function for more accuracy
    function getSpotPriceSansFee(address tokenIn, address tokenOut) external view returns (uint spotPrice);

    function calcOutGivenIn(
        uint256 tokenBalanceIn,
        uint256 tokenWeightIn,
        uint256 tokenBalanceOut,
        uint256 tokenWeightOut,
        uint256 tokenAmountIn,
        uint256 swapFee
    )
        external pure
        returns (uint256 tokenAmountOut);
}

interface INexusMutual {
    function getToken(uint256 weiPaid) external view returns(uint256 tokenToGet);
    function getWei(uint256 amount) external view returns(uint256 weiToPay);

}


contract BalancerNexusCondition  {

    // Balancer record struct
    struct Record {
        bool bound;   // is token bound to pool
        uint index;   // private
        uint denorm;  // denormalized weight
        uint balance;
    }

    address public immutable WETH;
    address public immutable NXM;
    address public immutable WNXM;

    IBalancer public immutable balancer;
    INexusMutual public immutable nexus;

    uint256 public immutable balancerSwapFee;

    uint256 public minDifference;

    constructor(
        address _weth,
        address _nxm,
        address _wnxm,

        address _balancer,
        address _nexus,

        uint256 _swapFee, // for balancer call

        uint256 _minDifference // min difference in NVM tokens between the two in order for the bot to execute the arbitrage
    ) public {
        WETH = _weth;
        NXM = _nxm;
        WNXM = _wnxm;

        balancer = IBalancer(_balancer);
        nexus = INexusMutual(_nexus);
        balancerSwapFee = _swapFee;
        minDifference = _minDifference;

    }

    // Specific implementation
    function isArbitrageReady(
        uint256  _wei,
        Record memory _inRecord,
        Record memory _outRecord
    )
        public
        view
        returns(string memory)
    {
        uint256 nxmAmountPerEthOnBalancer = balancer.calcOutGivenIn(
            _inRecord.balance,
            _inRecord.denorm,
            _outRecord.balance,
            _outRecord.denorm,
            _wei,
            balancerSwapFee
        );

        uint256 nxmAmountPerEthOnNexus = nexus.getToken(_wei);

        if (nxmAmountPerEthOnBalancer > nxmAmountPerEthOnNexus)
            if (nxmAmountPerEthOnBalancer - nxmAmountPerEthOnNexus > minDifference) return "OK";
        if (nxmAmountPerEthOnBalancer < nxmAmountPerEthOnNexus)
            if (nxmAmountPerEthOnNexus - nxmAmountPerEthOnBalancer > minDifference) return "OK";

        return "Arbitrage not Ready";
    }


    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256, bytes calldata _conditionData, uint256)
        public
        view
        returns(string memory)
    {
        (uint256 _wei, Record memory inRecord, Record memory outRecord) = abi.decode(_conditionData, (uint256,Record,Record));
        return isArbitrageReady(_wei, inRecord, outRecord);
    }


    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(uint256  _wei, Record memory _inRecord, Record memory _outRecord)
        public
        pure
        returns(bytes memory)
    {
        return abi.encode(_wei, _inRecord, _outRecord);
    }
}



