// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IWETH {
    function deposit(uint256 _payableAmount) external payable;
    function withdraw(uint256 _wad) external;
    function approve(address _guy, uint256 _wad) external;
}
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IWNXM {
    function approve(address spender, uint256 amount) external returns (bool);
}


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

    function swapExactAmountIn(
        address tokenIn,
        uint tokenAmountIn,
        address tokenOut,
        uint minAmountOut,
        uint maxPrice
    )
        external
        returns (uint tokenAmountOut, uint spotPriceAfter);

}

interface INexusMutual {

    function buyToken() external payable returns(bool success);
    function sellNXMTokens(uint _amount) external returns(bool success);

    function getToken(uint256 weiPaid) external view returns(uint256 tokenToGet);
    function getWei(uint256 amount) external view returns(uint256 weiToPay);


}


contract BalancerNexusAction  {

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
    function executeArbitrage(
        uint256  _wei,
        Record memory _inRecord,
        Record memory _outRecord
    )
        public
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

            // 1. Wrap ETH to WETH
            IWETH(WETH).deposit{value: _wei}(_wei);

            // 2. Approve Balancer Pool for WETH
            IWETH(WETH).approve(address(balancer), _wei);

            // 3. Swap WETH to WNXM
            balancer.swapExactAmountIn(
                WETH,
                _wei,
                WNXM,
                nxmAmountPerEthOnBalancer,
                0 // can be set to 0
            );

            // To DO: 4. Unwrap WNXM to NXM

            // 5. Approve NXM to nexus
            IERC20(NXM).approve(address(nexus), nxmAmountPerEthOnBalancer);

            // 6. Swap NXM to ETH on Nexus
            nexus.sellNXMTokens(nxmAmountPerEthOnBalancer);

            // DONE

        if (nxmAmountPerEthOnBalancer < nxmAmountPerEthOnNexus)

            // 1. Swap ETH to NXM on Nexus
            nexus.buyToken{value: _wei}();

            // 2. Approve Wrapping Contract
            IWNXM(WNXM).approve(address(WNXM), nxmAmountPerEthOnNexus);

            // To DO: 3. Wrap NXM to WNXM

            // 4. Approve WNXM to balancer
            IERC20(WNXM).approve(address(balancer), nxmAmountPerEthOnNexus);

            // 5. Swap WNXM to WETH on Balancer
            (uint tokenAmountOut,) = balancer.swapExactAmountIn(
                WNXM,
                nxmAmountPerEthOnNexus,
                WETH,
                0, // can be set to 0
                0 // can be set to 0
            );

            // 6. Unwrap WETH to ETH
            IWETH(WETH).withdraw(tokenAmountOut);
            // DONE
    }

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    /// Human Readable ABI: ["function getActionData(address _token)"]
    function getActionData(
        uint256  _wei,
        Record memory _inRecord,
        Record memory _outRecord
    )
        public
        pure
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.executeArbitrage.selector,
            _wei,
            _inRecord,
            _outRecord
        );
    }
}