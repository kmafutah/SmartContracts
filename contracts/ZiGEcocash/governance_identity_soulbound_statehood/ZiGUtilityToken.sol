// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
/**
 * @title ZiG Utility Token
 * @dev Multi-purpose utility token for ecosystem services
 */
abstract contract ZiGUtilityToken is ERC1155, Ownable {
    using Math for uint256;
    
    mapping(uint256 => string) public tokenURIs;
    mapping(uint256 => uint256) public tokenSupply;
    mapping(address => bool) public minters;
    
    // Token IDs for different utilities
    uint256 public constant TRANSACTION_FEE_TOKEN = 1;
    uint256 public constant STAKING_REWARD_TOKEN = 2;
    uint256 public constant GOVERNANCE_BONUS_TOKEN = 3;
    uint256 public constant CULTURAL_ACCESS_TOKEN = 4;
    
    constructor() ERC1155("") {
        minters[msg.sender] = true;
    }
    
    function mint(
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes memory _data
    ) external {
        require(minters[msg.sender], "ZiGUtility: Not authorized minter");
        _mint(_to, _id, _amount, _data);
        tokenSupply[_id] = tokenSupply[_id] + _amount;
    }
    
    function setTokenURI(uint256 _id, string memory _uri) external onlyOwner {
        tokenURIs[_id] = _uri;
    }
    
    function uri(uint256 _id) public view virtual override returns (string memory) {
        return tokenURIs[_id];
    }
}