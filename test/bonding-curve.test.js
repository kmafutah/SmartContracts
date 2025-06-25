// Tests for Bonding Curve pricing
describe("ZiGBondingCurve", function () {
  let BondingCurve, curve, owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    BondingCurve = await ethers.getContractFactory("contracts/ZiGT_github/ZiGBondingCurve.sol:ZiGBondingCurve");
    curve = await BondingCurve.deploy();
    await curve.deployed();
  });

  it("should calculate token price correctly", async function () {
    const price = await curve.getCurrentPrice();
    expect(price).to.be.gt(0);
  });

  it("should mint based on curve price", async function () {
    await curve.buy({ value: ethers.utils.parseEther("1") });
    expect(await curve.totalSupply()).to.be.gt(0);
  });
});
