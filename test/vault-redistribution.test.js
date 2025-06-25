// Tests for Redistribution Vault
describe("RedistributionVault", function () {
  let Vault, vault, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    Vault = await ethers.getContractFactory("RedistributionVault");
    vault = await Vault.deploy();
    await vault.deployed();
  });

  it("should accept deposits", async function () {
    await vault.deposit({ value: ethers.utils.parseEther("1") });
    expect(await ethers.provider.getBalance(vault.address)).to.equal(ethers.utils.parseEther("1"));
  });

  it("should allow redistribution to a user", async function () {
    await vault.deposit({ value: ethers.utils.parseEther("1") });
    await vault.redistribute([addr1.address], [ethers.utils.parseEther("0.5")]);
    expect(await ethers.provider.getBalance(addr1.address)).to.be.above(0);
  });
});
