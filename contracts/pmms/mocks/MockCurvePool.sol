// contracts/mocks/MockCurvePool.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract MockCurvePool {
    address public token0;
    address public token1;
    address public token2;
    constructor(address _token0, address _token1, address _token2) {
        token0 = _token0;
        token1 = _token1;
        token2 = _token2;
    }
    function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external {
        IERC20(token0).transferFrom(msg.sender, address(this), amounts[0]);
        IERC20(token1).transferFrom(msg.sender, address(this), amounts[1]);
        IERC20(token2).transferFrom(msg.sender, address(this), amounts[2]);
    }
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external {
        address tokenIn = i == 0 ? token0 : i == 1 ? token1 : token2;
        address tokenOut = j == 0 ? token0 : j == 1 ? token1 : token2;
        IERC20(tokenIn).transferFrom(msg.sender, address(this), dx);
        IERC20(tokenOut).transfer(msg.sender, min_dy);
    }
}