// GameFi + NFT interaction tests
describe("ZiGGameFiToken", function () {
  let GameNFT, nft, owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    GameNFT = await ethers.getContractFactory("contracts/ZiGT_github/ZiGGameFiToken.sol:ZiGGameFiToken");
    
    nft = await GameNFT.deploy("ZiGGame", "ZGNFT");
    await nft.deployed();
  });

  it("should mint NFT to player", async function () {
    await nft.safeMint(owner.address, "ipfs://meta1");
    expect(await nft.ownerOf(0)).to.equal(owner.address);
  });
});
