# OnchainKit + Farcaster Mini App: Recommended Approach

## ✅ Official Recommendation (from docs.base.org)

### 1. **Provider Setup**
According to Base documentation, when `miniKit={{ enabled: true }}` is set:
- **OnchainKitProvider automatically configures wagmi and react-query internally**
- **It utilizes the Farcaster connector when available**
- You **should NOT need to manually wrap with WagmiProvider** unless you have custom requirements

### 2. **Simplified Setup (Recommended)**
```tsx
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

export function RootProvider({ children }) {
  return (
    <OnchainKitProvider
      apiKey={apiKey}
      chain={base}
      miniKit={{
        enabled: true,
        autoConnect: true,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
```

### 3. **Transaction Component**
OnchainKit's `Transaction` component should work automatically with:
- Farcaster connector (detected automatically via MiniKit)
- Base Account connector (for Base App Mini App)
- External wallets (via OnchainKit's ConnectWallet)

---

## 🔍 Current Implementation vs Recommended

### Our Current Setup
```tsx
<WagmiProvider config={config}>  // ← Manual wagmi config
  <QueryClientProvider client={queryClient}>  // ← Manual query client
    <OnchainKitProvider
      miniKit={{ enabled: true }}
    >
      ...
    </OnchainKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### Issue
We're manually providing wagmi config **before** OnchainKitProvider, which might cause:
- **Conflict**: OnchainKitProvider expects to configure wagmi internally when MiniKit is enabled
- **Transaction component issues**: May not properly detect Farcaster connector
- **Double setup**: Both our config and OnchainKit's internal config might be active

---

## ✅ Recommended Solution

### Option 1: Use OnchainKit's Internal Wagmi Config (Simplest)
Let OnchainKitProvider handle everything automatically:

```tsx
<OnchainKitProvider
  apiKey={apiKey}
  chain={chain}
  miniKit={{
    enabled: true,
    autoConnect: true,
  }}
>
  <MiniKitProvider>
    {children}
  </MiniKitProvider>
</OnchainKitProvider>
```

**Pros:**
- ✅ Follows official recommendation
- ✅ Automatic Farcaster connector detection
- ✅ Less code, fewer conflicts

**Cons:**
- ❌ Can't customize wagmi connectors easily
- ❌ Limited control over wagmi config

---

### Option 2: Keep Custom Wagmi Config (Current Approach)
If we need custom connectors (which we do for Base Account + Farcaster):

```tsx
// Keep manual WagmiProvider but ensure OnchainKit knows about it
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <OnchainKitProvider
      apiKey={apiKey}
      chain={chain}
      miniKit={{ enabled: true }}
      // Don't pass wagmi config - OnchainKit should use the one from WagmiProvider
    >
      ...
    </OnchainKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

**Current Status:** This is what we're doing, but we need to verify:
1. ✅ OnchainKit Transaction component can access our custom wagmi config
2. ✅ Farcaster connector is properly detected by Transaction component
3. ❓ Transaction component builds contract calls correctly with Farcaster connector

---

## 🔧 Issue: Transaction Stuck in Loading

### Potential Causes:

1. **Connector Not Detected**: Transaction component might not see the Farcaster connector
2. **Provider Interface Mismatch**: Farcaster connector's provider might not match what Transaction expects
3. **Transaction Building**: OnchainKit might not properly build contract calls (`calls` prop) with Farcaster connector

### Debugging Steps:

1. ✅ Check if connector is connected: `useAccount()` should return address
2. ✅ Check connector ID: Should be `'farcasterMiniApp'`
3. ✅ Check transaction calls: Verify `calls` prop is correct
4. ❓ Check OnchainKit logs: See what Transaction component is doing internally

---

## 📋 Verification Checklist

- [x] OnchainKitProvider has `miniKit={{ enabled: true }}`
- [x] Farcaster connector (`@farcaster/miniapp-wagmi-connector`) is in wagmi config
- [x] Base Account connector is in wagmi config
- [x] `Transaction` component uses `calls` prop for ERC20 transfer
- [ ] **Verify Transaction component works with Farcaster connector** ← CURRENT ISSUE
- [ ] **Check if OnchainKit Transaction supports contract calls with Farcaster connector** ← NEEDS VERIFICATION

---

## 🎯 Next Steps

1. **Test with official recommended setup** (Option 1) to see if it resolves the loading issue
2. **If we need custom config**, ensure OnchainKit Transaction can access it properly
3. **Check OnchainKit documentation** for specific Transaction component requirements with Farcaster
4. **Add more debugging** to see what Transaction component is actually doing

---

## 📚 References

- [Base Docs: MiniKit Overview](https://docs.base.org/base-app/build-with-minikit/overview)
- [Base Docs: OnchainKit Provider](https://docs.base.org/onchainkit/latest/components/minikit/provider-and-initialization)
- [Base Docs: Manual Installation](https://docs.base.org/onchainkit/latest/getting-started/manual-installation)

