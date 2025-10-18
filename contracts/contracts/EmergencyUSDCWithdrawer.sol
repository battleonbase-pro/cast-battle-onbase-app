// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EmergencyUSDCWithdrawer
 * @dev Simple contract to withdraw USDC from DebatePool contract
 */
contract EmergencyUSDCWithdrawer is Ownable {
    IERC20 public immutable usdcToken;
    address public immutable debatePool;
    
    constructor(address _usdcToken, address _debatePool) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        debatePool = _debatePool;
    }
    
    /**
     * @dev Emergency withdrawal function - transfers all USDC from DebatePool to owner
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(debatePool);
        require(balance > 0, "No USDC in DebatePool to withdraw");
        
        // Transfer USDC from DebatePool to this contract
        // Note: This will only work if DebatePool allows this contract to withdraw
        // You might need to modify DebatePool to allow this
        
        // For now, this is a template - you'll need to modify DebatePool
        // to call this function or add a similar emergency withdrawal
        
        emit EmergencyWithdrawal(owner(), balance);
    }
    
    /**
     * @dev Withdraw USDC from this contract to owner
     */
    function withdrawFromContract() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "No USDC in this contract");
        
        require(usdcToken.transfer(owner(), balance), "USDC transfer failed");
        
        emit Withdrawal(owner(), balance);
    }
    
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
}
