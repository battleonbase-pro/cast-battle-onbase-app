// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title MinimalDebatePool
 * @dev Minimal contract for debate pools - maximum backend, minimum on-chain
 * @notice Only essential trustless operations on-chain, everything else handled by backend
 */
contract MinimalDebatePool is ReentrancyGuard, Ownable, EIP712 {
    using ECDSA for bytes32;

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 20; // 20% platform fee
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_REFUND_RECIPIENTS = 100; // Maximum recipients per refund call

    // Immutable state
    IERC20 public immutable usdcToken;
    address public immutable oracle;

    // Minimal state
    bool public paused;
    mapping(uint256 => bool) public completedDebates;
    mapping(uint256 => bool) public pausedDebates;
    mapping(uint256 => uint256) public platformFees; // Track platform fees per debate

    // Events
    event WinnerDistributed(
        uint256 indexed debateId,
        address indexed winner,
        uint256 winnerPrize,
        uint256 platformFee
    );
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event PauseToggled(bool paused);
    event DebatePaused(uint256 indexed debateId);
    event RefundProcessed(
        uint256 indexed debateId,
        address indexed recipient,
        uint256 amount
    );
    event EmergencyRefundProcessed(
        uint256 indexed debateId,
        address indexed recipient,
        uint256 amount
    );

    // Modifiers
    modifier onlyOracle() {
        require(msg.sender == oracle, "MinimalDebatePool: Not oracle");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "MinimalDebatePool: Contract paused");
        _;
    }

    modifier validDebate(uint256 debateId) {
        require(!pausedDebates[debateId], "MinimalDebatePool: Debate paused");
        _;
    }

    /**
     * @dev Constructor
     * @param _usdcToken USDC token address
     * @param _oracle Oracle address (for signing winner distributions)
     */
    constructor(address _usdcToken, address _oracle) Ownable(msg.sender) EIP712("MinimalDebatePool", "1") {
        require(_usdcToken != address(0), "MinimalDebatePool: Invalid USDC token");
        require(_oracle != address(0), "MinimalDebatePool: Invalid oracle");
        usdcToken = IERC20(_usdcToken);
        oracle = _oracle;
    }

    /**
     * @dev Distribute winner prize and platform fee
     * @param debateId Debate ID (for tracking and preventing double distribution)
     * @param winner Winner address
     * @param winnerPrize Amount to send to winner (backend calculates: 80% of pool)
     * @param signature Oracle signature for security
     */
    function distributeWinner(
        uint256 debateId,
        address winner,
        uint256 winnerPrize,
        bytes memory signature
    ) external onlyOracle whenNotPaused validDebate(debateId) nonReentrant {
        require(!completedDebates[debateId], "MinimalDebatePool: Already completed");
        require(winner != address(0), "MinimalDebatePool: Invalid winner");
        require(winnerPrize > 0, "MinimalDebatePool: Invalid prize amount");
        
        // CRITICAL: Prevent draining contract balance
        require(
            winnerPrize <= usdcToken.balanceOf(address(this)),
            "MinimalDebatePool: Prize exceeds contract balance"
        );

        // Verify oracle signature
        require(
            _verifyWinnerSignature(debateId, winner, winnerPrize, signature),
            "MinimalDebatePool: Invalid signature"
        );

        // Mark as completed
        completedDebates[debateId] = true;

        // Calculate platform fee correctly
        // If winnerPrize = 80% of total collected, then:
        // total = winnerPrize * 100 / 80
        // platformFee = total - winnerPrize = (winnerPrize * 100 / 80) - winnerPrize
        // Simplified: platformFee = winnerPrize * 20 / 80 = winnerPrize / 4
        // Since PLATFORM_FEE_PERCENTAGE = 20 represents 20% (not basis points in this context):
        // If winnerPrize is 80% and platform fee is 20%, then: platformFee = winnerPrize / 4
        uint256 calculatedPlatformFee = winnerPrize / 4; // Correct: 20% of total = (80% of total) / 4
        
        // Track platform fee for this debate (allows owner to withdraw separately)
        platformFees[debateId] = calculatedPlatformFee;

        // Transfer winner prize
        require(
            usdcToken.transfer(winner, winnerPrize),
            "MinimalDebatePool: Winner transfer failed"
        );

        emit WinnerDistributed(debateId, winner, winnerPrize, calculatedPlatformFee);
    }

    /**
     * @dev Withdraw platform fees for a specific debate
     * @param debateId Debate ID to withdraw fees from
     * @notice Owner can withdraw platform fees after debate is completed
     */
    function withdrawDebateFees(uint256 debateId) external onlyOwner nonReentrant {
        require(completedDebates[debateId], "MinimalDebatePool: Debate not completed");
        uint256 fees = platformFees[debateId];
        require(fees > 0, "MinimalDebatePool: No fees for this debate");
        
        // Clear the fee tracking to prevent double withdrawal
        platformFees[debateId] = 0;
        
        require(
            usdcToken.transfer(owner(), fees),
            "MinimalDebatePool: Withdrawal failed"
        );

        emit FeesWithdrawn(owner(), fees);
    }

    /**
     * @dev Withdraw all accumulated platform fees (DEPRECATED - Use withdrawDebateFees)
     * @notice This function is disabled to prevent gas issues and ensure safety
     * @dev Use withdrawDebateFees(uint256) to withdraw fees for specific debates
     */
    function withdrawAllFees() external onlyOwner {
        // Disabled to prevent gas exhaustion and ensure precise fee withdrawal
        // Use withdrawDebateFees(debateId) instead for individual debate fees
        revert("MinimalDebatePool: Use withdrawDebateFees instead for safety");
    }

    /**
     * @dev Toggle emergency pause for entire contract
     * @notice Owner can pause all contract operations in emergency
     */
    function togglePause() external onlyOwner {
        paused = !paused;
        emit PauseToggled(paused);
    }

    /**
     * @dev Pause a specific debate
     * @param debateId Debate ID to pause
     */
    function pauseDebate(uint256 debateId) external onlyOwner {
        pausedDebates[debateId] = true;
        emit DebatePaused(debateId);
    }

    /**
     * @dev Unpause a specific debate
     * @param debateId Debate ID to unpause
     */
    function unpauseDebate(uint256 debateId) external onlyOwner {
        pausedDebates[debateId] = false;
    }

    // ==================== REFUND FUNCTIONS (Safety Mechanisms) ====================

    /**
     * @dev Process refund for specific addresses (no participant array required)
     * @param debateId Debate ID
     * @param recipients Array of addresses to refund
     * @param refundAmount Amount to refund per recipient
     * @param signature Oracle signature authorizing refund
     */
    function processRefund(
        uint256 debateId,
        address[] calldata recipients,
        uint256 refundAmount,
        bytes memory signature
    ) external onlyOracle whenNotPaused validDebate(debateId) nonReentrant {
        require(!completedDebates[debateId], "MinimalDebatePool: Already completed");
        require(recipients.length > 0, "MinimalDebatePool: No recipients");
        require(
            recipients.length <= MAX_REFUND_RECIPIENTS,
            "MinimalDebatePool: Too many recipients"
        );
        require(refundAmount > 0, "MinimalDebatePool: Invalid refund amount");
        
        // Prevent excessive refund amounts
        require(
            refundAmount <= usdcToken.balanceOf(address(this)) / recipients.length,
            "MinimalDebatePool: Refund amount too large"
        );

        // Verify oracle signature
        bytes32 messageHash = keccak256(
            abi.encode(debateId, recipients, refundAmount)
        );
        require(
            _verifyRefundSignature(messageHash, signature),
            "MinimalDebatePool: Invalid refund signature"
        );

        // Process refunds
        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                usdcToken.transfer(recipients[i], refundAmount),
                "MinimalDebatePool: Refund transfer failed"
            );
            emit RefundProcessed(debateId, recipients[i], refundAmount);
        }
    }

    /**
     * @dev Emergency refund by owner (no signature required)
     * @param debateId Debate ID
     * @param recipients Array of addresses to refund
     * @param refundAmount Amount to refund per recipient
     */
    function emergencyRefund(
        uint256 debateId,
        address[] calldata recipients,
        uint256 refundAmount
    ) external onlyOwner validDebate(debateId) nonReentrant {
        require(recipients.length > 0, "MinimalDebatePool: No recipients");
        require(
            recipients.length <= MAX_REFUND_RECIPIENTS,
            "MinimalDebatePool: Too many recipients"
        );
        require(refundAmount > 0, "MinimalDebatePool: Invalid refund amount");
        
        // Prevent excessive refund amounts
        require(
            refundAmount <= usdcToken.balanceOf(address(this)) / recipients.length,
            "MinimalDebatePool: Refund amount too large"
        );

        // Process refunds
        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                usdcToken.transfer(recipients[i], refundAmount),
                "MinimalDebatePool: Emergency refund transfer failed"
            );
            emit EmergencyRefundProcessed(debateId, recipients[i], refundAmount);
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Get contract USDC balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    /**
     * @dev Check if debate is completed
     */
    function isDebateCompleted(uint256 debateId) external view returns (bool) {
        return completedDebates[debateId];
    }

    /**
     * @dev Get platform fees for a specific debate
     */
    function getPlatformFees(uint256 debateId) external view returns (uint256) {
        return platformFees[debateId];
    }

    // ==================== INTERNAL FUNCTIONS ====================

    /**
     * @dev Verify oracle signature for winner distribution
     */
    function _verifyWinnerSignature(
        uint256 debateId,
        address winner,
        uint256 winnerPrize,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("WinnerDistribution(uint256 debateId,address winner,uint256 winnerPrize)"),
                debateId,
                winner,
                winnerPrize
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        return signer == oracle;
    }

    /**
     * @dev Verify oracle signature for refund
     */
    function _verifyRefundSignature(
        bytes32 messageHash,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 hash = _hashTypedDataV4(messageHash);
        address signer = ECDSA.recover(hash, signature);
        return signer == oracle;
    }
}
