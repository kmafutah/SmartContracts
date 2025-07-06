// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
/**
 * @title ZiG Meme Token
 * @dev Community-driven meme token for viral marketing
 */
contract ZiGMemeToken is ERC20, Ownable {
    using Math for uint256;
    
    uint256 public constant MAX_SUPPLY = 1000000000e18; // 1 billion
    mapping(address => bool) public memeCreators;
    
    event MemeCreated(address indexed creator, uint256 amount, string memeHash);
    
    constructor() ERC20("ZiG Meme Token", "ZiGMeme") Ownable(msg.sender) {
        memeCreators[msg.sender] = true;
    }
    
    function createMeme(uint256 _amount, string memory _memeHash) external {
        require(memeCreators[msg.sender], "ZiGMEME: Not authorized creator");
        require(totalSupply() + _amount <= MAX_SUPPLY, "ZiGMEME: Max supply exceeded");

        
        _mint(msg.sender, _amount);
        emit MemeCreated(msg.sender, _amount, _memeHash);
    }
    
    function addMemeCreator(address _creator) external onlyOwner {
        memeCreators[_creator] = true;
    }
}
