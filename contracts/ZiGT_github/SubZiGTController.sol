// SubZiGTController.sol
contract SubZiGTController {
    address public governance;
    address public mutapaBacking;
    address public subZiGT;

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    constructor(address _governance, address _backing, address _token) {
        governance = _governance;
        mutapaBacking = _backing;
        subZiGT = _token;
    }

    function mintSubZiGT(address to, uint256 amount) external onlyGovernance {
        uint256 backing = MutapaReserveBacking(mutapaBacking).getTotalBacking();
        require(backing >= amount, "Insufficient backing");
        IZiGT(subZiGT).mint(to, amount);
    }
}
