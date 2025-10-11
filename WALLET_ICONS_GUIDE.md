# Wallet Icon Replacement Guide

## Current Icon Files Created:
- `/public/wallet-icons/metamask.svg` - MetaMask icon (orange fox)
- `/public/wallet-icons/coinbase.svg` - Base Wallet icon (blue circle)
- `/public/wallet-icons/rabby.svg` - Rabby Wallet icon (orange square)
- `/public/wallet-icons/walletconnect.svg` - WalletConnect icon (blue circles)
- `/public/wallet-icons/phantom.svg` - Phantom icon (purple ghost)
- `/public/wallet-icons/trust.svg` - Trust Wallet icon (blue shield)
- `/public/wallet-icons/default.svg` - Default fallback icon

## How to Replace Icons:

### Option 1: Replace with Official Icons
1. Download official wallet icons from their websites
2. Convert to SVG format (recommended) or use PNG/JPG
3. Replace the files in `/public/wallet-icons/`
4. Keep the same filenames for automatic detection

### Option 2: Use Icon Libraries
1. Install an icon library like `react-icons` or `lucide-react`
2. Update the `getWalletIcon` function to return icon components instead of paths
3. Example:
```tsx
import { FaEthereum } from 'react-icons/fa';
// Return <FaEthereum /> instead of '/wallet-icons/metamask.svg'
```

### Option 3: Custom SVG Icons
1. Create custom SVG icons using design tools
2. Ensure they're 32x32px and have proper viewBox
3. Replace the existing files

## Fallback System:
- If an image fails to load, the component automatically falls back to emoji icons
- This ensures the UI never breaks even if icons are missing

## File Formats Supported:
- SVG (recommended - scalable and crisp)
- PNG (good for complex designs)
- JPG (not recommended for icons)

## Icon Specifications:
- Size: Any size (will be scaled to 32x32px automatically)
- Format: SVG preferred (PNG/JPG also supported)
- Style: Should match your app's design language
- Colors: Should work on both light and dark backgrounds
- ViewBox: Any viewBox is supported (CSS handles scaling)

## Current Official Icons Used:
- **MetaMask**: Official orange fox logo (142x137 viewBox)
- **Base Wallet**: Official Coinbase blue circle logo (1024x1024 viewBox)
- **Rabby**: Official purple rabbit logo (512x512 viewBox)
- **WalletConnect**: Official blue circles logo (32x32 viewBox)
- **Phantom**: Official purple ghost logo (1200x1200 viewBox)
- **Trust Wallet**: Official blue gradient logo (512x512 viewBox)

## CSS Scaling Features:
- Icons automatically scale to fit 32x32px container
- `object-fit: contain` ensures aspect ratio is maintained
- `overflow: hidden` prevents icons from breaking layout
- Responsive scaling for mobile devices (28px, 24px)
