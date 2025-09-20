# Battle Configuration

## Simplified Battle Timing

### ✅ Single Configuration Variable
- **Battle Duration**: Controls both battle length AND generation interval
- **Logic**: Battle duration = Generation interval (no overlaps)
- **Result**: One battle at a time, clean transitions

## Configuration Options

### Environment Variables
```bash
# Daily battles (24 hours each)
BATTLE_DURATION_HOURS=24

# Twice daily battles (12 hours each)  
BATTLE_DURATION_HOURS=12

# Weekly battles (168 hours each)
BATTLE_DURATION_HOURS=168

# Other settings
BATTLE_MAX_PARTICIPANTS=1000
BATTLE_GENERATION_ENABLED=true
```

### Battle Lifecycle
1. **Start**: New battle created with fresh news topic
2. **Duration**: Battle runs for exactly `BATTLE_DURATION_HOURS`
3. **Completion**: Battle automatically completes and determines winners
4. **History**: Completed battle added to history
5. **New Battle**: Fresh battle starts immediately (no gap)

## Key Principle
**Single Variable Controls Everything**

This ensures:
- ✅ **Simplicity**: One variable instead of two
- ✅ **No Confusion**: Can't have mismatched intervals
- ✅ **No Overlaps**: Impossible to create overlapping battles
- ✅ **Easy Configuration**: Change one value, everything updates
