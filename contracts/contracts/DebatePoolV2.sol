// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title DebatePoolV2
 * @dev Enhanced debate pool contract with fund safety mechanisms and points system
 * @notice Features automatic refunds, emergency controls, and airdrop-ready points system
 */
contract DebatePoolV2 is ReentrancyGuard, Ownable, EIP712 {
    using ECDSA for bytes32;

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 20; // 20% platform fee
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant REFUND_PERIOD = 7 days;      // 7 days to claim refund
    uint256 public constant TIMEOUT_PERIOD = 24 hours;   // 24 hours after debate ends
    
    // Points system constants
    uint256 public constant DEBATE_PARTICIPATION_POINTS = 100;  // 1 USDC debate
    uint256 public constant DEBATE_WINNER_POINTS = 1000;       // Winner bonus
    uint256 public constant LIKE_POINTS = 10;                  // Free like
    uint256 public constant SHARE_POINTS = 10;                 // Any share

    // State variables
    IERC20 public immutable usdcToken;
    address public immutable oracle; // AI judge oracle address
    
    uint256 public nextDebateId = 1;
    bool public emergencyPaused = false;
    
    // Debate management
    mapping(uint256 => Debate) public debates;
    mapping(address => uint256[]) public userDebates;
    mapping(uint256 => uint256) public refundDeadlines;
    
    // Points system (for future airdrops)
    mapping(address => uint256) public userPoints;
    
    // Airdrop system (future-ready)
    IERC20 public airdropToken;
    bool public airdropEnabled = false;
    uint256 public airdropSnapshotBlock;
    uint256 public totalAirdropAmount;
    mapping(address => uint256) public airdropClaimed;

    // EIP-712 type hash for winner results
    bytes32 private constant WINNER_RESULT_TYPEHASH = keccak256(
        "WinnerResult(uint256 debateId,address winner,uint256 timestamp)"
    );
    
    // EIP-712 type hash for points awards
    bytes32 private constant POINTS_AWARD_TYPEHASH = keccak256(
        "PointsAward(address user,uint256 points,string reason,uint256 timestamp)"
    );
    
    // EIP-712 type hash for airdrop claims
    bytes32 private constant AIRDROP_CLAIM_TYPEHASH = keccak256(
        "AirdropClaim(uint256 userPointsAmount,uint256 totalPoints,bytes32 messageHash)"
    );

    // Events
    event DebateCreated(uint256 indexed debateId, string topic, uint256 entryFee);
    event ParticipantJoined(uint256 indexed debateId, address participant);
    event WinnerDeclared(uint256 indexed debateId, address winner, uint256 prize);
    event RefundProcessed(uint256 indexed debateId, address participant, uint256 amount);
    event EmergencyPauseToggled(bool paused);
    event PointsAwarded(address indexed user, uint256 points, string reason);
    event AirdropSetup(address indexed token, uint256 totalAmount, uint256 snapshotBlock);
    event AirdropClaimed(address indexed user, uint256 amount, uint256 points);

    // Structs
    struct Debate {
        uint256 id;
        string topic;
        uint256 entryFee;
        uint256 maxParticipants;
        uint256 startTime;    // UTC timestamp (seconds since epoch)
        uint256 endTime;      // UTC timestamp (seconds since epoch)
        address[] participants;
        address winner;
        bool isActive;
        bool isCompleted;
    }

    struct WinnerResult {
        uint256 debateId;
        address winner;
        uint256 timestamp;
        bytes signature;
    }

    struct PointsAward {
        address user;
        uint256 points;
        string reason;
        uint256 timestamp;
        bytes signature;
    }

    // Modifiers
    modifier onlyOracle() {
        require(msg.sender == oracle, "DebatePoolV2: Only oracle can call this function");
        _;
    }

    modifier onlyOwnerOrOracle() {
        require(msg.sender == owner() || msg.sender == oracle, "DebatePoolV2: Only owner or oracle can call this function");
        _;
    }

    modifier whenNotPaused() {
        require(!emergencyPaused, "DebatePoolV2: Contract is paused");
        _;
    }

    modifier validDebate(uint256 debateId) {
        require(debateId > 0 && debateId < nextDebateId, "DebatePoolV2: Invalid debate ID");
        _;
    }

    modifier debateActive(uint256 debateId) {
        Debate storage debate = debates[debateId];
        require(debate.isActive, "DebatePoolV2: Debate is not active");
        require(block.timestamp >= debate.startTime, "DebatePoolV2: Debate has not started");
        require(block.timestamp <= debate.endTime, "DebatePoolV2: Debate has ended");
        _;
    }

    /**
     * @dev Constructor
     * @param _usdcToken USDC token address on Base Sepolia
     * @param _oracle Oracle address (AI judge backend)
     */
    constructor(
        address _usdcToken,
        address _oracle
    ) EIP712("DebatePoolV2", "1") Ownable(msg.sender) {
        require(_usdcToken != address(0), "DebatePoolV2: Invalid USDC address");
        require(_oracle != address(0), "DebatePoolV2: Invalid oracle address");
        
        usdcToken = IERC20(_usdcToken);
        oracle = _oracle;
    }

    /**
     * @dev Create a new debate
     * @param topic Debate topic
     * @param entryFee Entry fee in USDC (with decimals)
     * @param maxParticipants Maximum number of participants
     * @param duration Duration in seconds
     * @return debateId The ID of the created debate
     */
    function createDebate(
        string memory topic,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 duration
    ) external onlyOracle whenNotPaused returns (uint256) {
        require(bytes(topic).length > 0, "DebatePoolV2: Topic cannot be empty");
        require(entryFee > 0, "DebatePoolV2: Entry fee must be greater than 0");
        require(maxParticipants > 1, "DebatePoolV2: Must allow at least 2 participants");
        require(duration > 0, "DebatePoolV2: Duration must be greater than 0");

        uint256 debateId = nextDebateId++;
        uint256 startTime = block.timestamp;  // UTC timestamp (seconds since epoch)
        uint256 endTime = startTime + duration; // UTC timestamp (seconds since epoch)

        debates[debateId] = Debate({
            id: debateId,
            topic: topic,
            entryFee: entryFee,
            maxParticipants: maxParticipants,
            startTime: startTime,
            endTime: endTime,
            participants: new address[](0),
            winner: address(0),
            isActive: true,
            isCompleted: false
        });

        // Set refund deadline (7 days after debate ends)
        refundDeadlines[debateId] = endTime + REFUND_PERIOD;

        emit DebateCreated(debateId, topic, entryFee);
        return debateId;
    }

    /**
     * @dev Join a debate by paying entry fee
     * @param debateId ID of the debate to join
     */
    function joinDebate(uint256 debateId) 
        external 
        validDebate(debateId) 
        debateActive(debateId) 
        whenNotPaused
        nonReentrant 
    {
        Debate storage debate = debates[debateId];
        
        require(debate.participants.length < debate.maxParticipants, "DebatePoolV2: Debate is full");
        require(!_isParticipant(debateId, msg.sender), "DebatePoolV2: Already participating");

        // Transfer USDC entry fee
        require(
            usdcToken.transferFrom(msg.sender, address(this), debate.entryFee),
            "DebatePoolV2: USDC transfer failed"
        );

        debate.participants.push(msg.sender);
        userDebates[msg.sender].push(debateId);

        // Award participation points
        userPoints[msg.sender] += DEBATE_PARTICIPATION_POINTS;
        emit PointsAwarded(msg.sender, DEBATE_PARTICIPATION_POINTS, "debate_participation");

        emit ParticipantJoined(debateId, msg.sender);
    }

    /**
     * @dev Declare winner and distribute rewards
     * @param result Winner result with signature
     */
    function declareWinner(WinnerResult memory result) 
        external 
        validDebate(result.debateId) 
        nonReentrant 
    {
        Debate storage debate = debates[result.debateId];
        
        require(debate.isActive, "DebatePoolV2: Debate is not active");
        require(!debate.isCompleted, "DebatePoolV2: Winner already declared");
        require(debate.participants.length > 0, "DebatePoolV2: No participants");
        require(_isParticipant(result.debateId, result.winner), "DebatePoolV2: Winner not a participant");
        
        // Verify signature
        require(_verifyWinnerResult(result), "DebatePoolV2: Invalid signature");

        // Calculate rewards
        uint256 totalPool = debate.entryFee * debate.participants.length;
        uint256 platformFee = (totalPool * PLATFORM_FEE_PERCENTAGE) / BASIS_POINTS;
        uint256 winnerPrize = totalPool - platformFee;

        // Update debate state
        debate.winner = result.winner;
        debate.isCompleted = true;
        debate.isActive = false;

        // Transfer winner prize
        require(
            usdcToken.transfer(result.winner, winnerPrize),
            "DebatePoolV2: Winner transfer failed"
        );

        // Award winner bonus points
        userPoints[result.winner] += DEBATE_WINNER_POINTS;
        emit PointsAwarded(result.winner, DEBATE_WINNER_POINTS, "debate_winner");

        emit WinnerDeclared(result.debateId, result.winner, winnerPrize);
    }

    /**
     * @dev Request refund for expired debate
     * @param debateId ID of the debate to refund
     */
    function requestRefund(uint256 debateId) external validDebate(debateId) nonReentrant {
        Debate storage debate = debates[debateId];
        
        require(block.timestamp > debate.endTime, "DebatePoolV2: Debate not expired");
        require(!debate.isCompleted, "DebatePoolV2: Winner already declared");
        require(_isParticipant(debateId, msg.sender), "DebatePoolV2: Not a participant");
        require(block.timestamp <= refundDeadlines[debateId], "DebatePoolV2: Refund period expired");
        
        // Refund user
        require(
            usdcToken.transfer(msg.sender, debate.entryFee),
            "DebatePoolV2: Refund transfer failed"
        );
        
        // Remove from participants
        _removeParticipant(debateId, msg.sender);
        
        emit RefundProcessed(debateId, msg.sender, debate.entryFee);
    }

    /**
     * @dev Process expired debates and refund all participants
     * @param debateId ID of the expired debate
     */
    function processExpiredDebate(uint256 debateId) external onlyOwnerOrOracle validDebate(debateId) nonReentrant {
        Debate storage debate = debates[debateId];
        
        require(block.timestamp > debate.endTime + TIMEOUT_PERIOD, "DebatePoolV2: Not expired yet");
        require(!debate.isCompleted, "DebatePoolV2: Already completed");
        
        // Refund all participants
        for (uint i = 0; i < debate.participants.length; i++) {
            address participant = debate.participants[i];
            usdcToken.transfer(participant, debate.entryFee);
            emit RefundProcessed(debateId, participant, debate.entryFee);
        }
        
        // Mark as completed
        debate.isCompleted = true;
        debate.isActive = false;
    }

    /**
     * @dev Emergency refund by owner
     * @param debateId ID of the debate to refund
     */
    function emergencyRefund(uint256 debateId) external onlyOwner validDebate(debateId) nonReentrant {
        Debate storage debate = debates[debateId];
        
        // Refund all participants
        for (uint i = 0; i < debate.participants.length; i++) {
            address participant = debate.participants[i];
            usdcToken.transfer(participant, debate.entryFee);
            emit RefundProcessed(debateId, participant, debate.entryFee);
        }
        
        // Mark as completed
        debate.isCompleted = true;
        debate.isActive = false;
    }

    /**
     * @dev Toggle emergency pause
     */
    function toggleEmergencyPause() external onlyOwner {
        emergencyPaused = !emergencyPaused;
        emit EmergencyPauseToggled(emergencyPaused);
    }

    /**
     * @dev Award points to user with EIP-712 signature verification
     * @param award Points award with signature
     */
    function awardPoints(PointsAward memory award) external nonReentrant {
        require(award.points > 0, "DebatePoolV2: Points must be greater than 0");
        require(bytes(award.reason).length > 0, "DebatePoolV2: Reason cannot be empty");
        
        // Verify signature
        require(_verifyPointsAward(award), "DebatePoolV2: Invalid signature");
        
        userPoints[award.user] += award.points;
        emit PointsAwarded(award.user, award.points, award.reason);
    }

    /**
     * @dev Award like points with EIP-712 signature verification
     * @param award Points award with signature
     */
    function awardLikePoints(PointsAward memory award) external nonReentrant {
        require(award.points == LIKE_POINTS, "DebatePoolV2: Invalid like points amount");
        require(keccak256(bytes(award.reason)) == keccak256(bytes("like")), "DebatePoolV2: Invalid reason");
        
        // Verify signature
        require(_verifyPointsAward(award), "DebatePoolV2: Invalid signature");
        
        userPoints[award.user] += LIKE_POINTS;
        emit PointsAwarded(award.user, LIKE_POINTS, "like");
    }

    /**
     * @dev Award share points with EIP-712 signature verification
     * @param award Points award with signature
     */
    function awardSharePoints(PointsAward memory award) external nonReentrant {
        require(award.points == SHARE_POINTS, "DebatePoolV2: Invalid share points amount");
        require(keccak256(bytes(award.reason)) == keccak256(bytes("share")), "DebatePoolV2: Invalid reason");
        
        // Verify signature
        require(_verifyPointsAward(award), "DebatePoolV2: Invalid signature");
        
        userPoints[award.user] += SHARE_POINTS;
        emit PointsAwarded(award.user, SHARE_POINTS, "share");
    }

    /**
     * @dev Setup airdrop (future-ready)
     * @param _airdropToken Token to airdrop
     * @param _totalAmount Total tokens to distribute
     */
    function setupAirdrop(
        address _airdropToken,
        uint256 _totalAmount
    ) external onlyOwner {
        require(_airdropToken != address(0), "DebatePoolV2: Invalid token");
        require(_totalAmount > 0, "DebatePoolV2: Invalid amount");
        
        airdropToken = IERC20(_airdropToken);
        totalAirdropAmount = _totalAmount;
        airdropSnapshotBlock = block.number;
        airdropEnabled = true;
        
        emit AirdropSetup(_airdropToken, _totalAmount, block.number);
    }

    /**
     * @dev Claim airdrop based on points
     * @param userPointsAmount User's total points
     * @param totalPoints Total points in system
     * @param messageHash Hash of the points data
     * @param signature Oracle signature
     */
    function claimAirdrop(
        uint256 userPointsAmount,
        uint256 totalPoints,
        bytes32 messageHash,
        bytes memory signature
    ) external nonReentrant {
        require(airdropEnabled, "DebatePoolV2: Airdrop not active");
        require(userPointsAmount > 0, "DebatePoolV2: No points to claim");
        
        // Verify the points data is valid (signed by oracle using EIP-712)
        bytes32 structHash = keccak256(
            abi.encode(
                AIRDROP_CLAIM_TYPEHASH,
                userPointsAmount,
                totalPoints,
                messageHash
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == oracle, "DebatePoolV2: Invalid signature");
        
        // Calculate user's share
        uint256 userShare = (userPointsAmount * totalAirdropAmount) / totalPoints;
        require(userShare > 0, "DebatePoolV2: No tokens to claim");
        
        // Transfer tokens to user
        airdropToken.transfer(msg.sender, userShare);
        
        emit AirdropClaimed(msg.sender, userShare, userPointsAmount);
    }

    /**
     * @dev Withdraw platform fees
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "DebatePoolV2: No funds to withdraw");
        
        require(
            usdcToken.transfer(owner(), balance),
            "DebatePoolV2: Withdrawal failed"
        );
    }

    // View functions
    function getDebate(uint256 debateId) external view validDebate(debateId) returns (Debate memory) {
        return debates[debateId];
    }

    function getUserDebates(address user) external view returns (uint256[] memory) {
        return userDebates[user];
    }

    function getUserPoints(address user) external view returns (uint256) {
        return userPoints[user];
    }

    function isParticipant(uint256 debateId, address user) external view returns (bool) {
        return _isParticipant(debateId, user);
    }

    // Internal functions
    function _isParticipant(uint256 debateId, address user) internal view returns (bool) {
        Debate storage debate = debates[debateId];
        for (uint i = 0; i < debate.participants.length; i++) {
            if (debate.participants[i] == user) {
                return true;
            }
        }
        return false;
    }

    function _removeParticipant(uint256 debateId, address user) internal {
        Debate storage debate = debates[debateId];
        for (uint i = 0; i < debate.participants.length; i++) {
            if (debate.participants[i] == user) {
                debate.participants[i] = debate.participants[debate.participants.length - 1];
                debate.participants.pop();
                break;
            }
        }
    }

    function _verifyWinnerResult(WinnerResult memory result) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                WINNER_RESULT_TYPEHASH,
                result.debateId,
                result.winner,
                result.timestamp
            )
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, result.signature);
        return signer == oracle;
    }

    function _verifyPointsAward(PointsAward memory award) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                POINTS_AWARD_TYPEHASH,
                award.user,
                award.points,
                keccak256(bytes(award.reason)),
                award.timestamp
            )
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, award.signature);
        return signer == oracle;
    }

    function verifyPointsSignature(
        bytes32 messageHash,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 hash = _hashTypedDataV4(messageHash);
        address signer = ECDSA.recover(hash, signature);
        return signer == oracle;
    }
}
