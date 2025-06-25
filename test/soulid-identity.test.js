// Tests for SoulID logic
describe("ZiGSoulID", function () {
  let SoulID, soul, owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    SoulID = await ethers.getContractFactory("ZiGSoulID");
    soul = await SoulID.deploy();
    await soul.deployed();
  });

  it("should mint a SoulID", async function () {
    await soul.mintSoulID(owner.address, "Tribe:Shona");
    expect(await soul.hasSoulID(owner.address)).to.equal(true);
  });
});
