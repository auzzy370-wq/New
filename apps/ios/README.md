# TapFlow POS — iOS App

A full-featured Point of Sale app built with SwiftUI + Stripe Terminal.

## Features

- **Full POS interface** — product grid, categories, search, cart
- **Tap to Pay on iPhone** — contactless payments via Stripe Terminal (iPhone XS+, iOS 16.4+)
- **Cash payments** — with change calculation
- **Order management** — create orders, view history
- **Customer picker** — attach customers to orders
- **Tips & discounts** — preset tips, custom tips, order/item discounts
- **Multi-location** — per-location tax rates and terminal config
- **Offline-ready UI** — browse products and build carts without network

## Requirements

| Requirement | Minimum |
|---|---|
| iOS | 16.4+ |
| Xcode | 15.4+ |
| Swift | 5.9+ |
| iPhone | XS or later (for Tap to Pay) |

## Building Locally

### Prerequisites
```bash
brew install xcodegen
```

### Generate Xcode project
```bash
cd apps/ios
xcodegen generate --spec project.yml
open TapFlowPOS.xcodeproj
```

### Configure backend URL
On first launch, tap **Configure Server** on the login screen and enter your backend API URL:
```
https://your-backend.com/api/v1
```

## Getting the IPA via GitHub Actions

Every push triggers a CI build. Go to:

**GitHub → Actions → Build iOS IPA → latest run → Artifacts → TapFlowPOS-unsigned-ipa**

Download `TapFlowPOS.ipa`.

## Installing the IPA (Sideloading)

1. Download **Sideloadly** from [sideloadly.io](https://sideloadly.io)
2. Connect your iPhone via USB
3. Drag `TapFlowPOS.ipa` into Sideloadly
4. Enter your Apple ID (free account works — re-sign every 7 days; paid account = 1 year)
5. Click **Start**
6. On iPhone: **Settings → General → VPN & Device Management → Trust [your Apple ID]**

## Tap to Pay on iPhone Requirements

Tap to Pay requires additional setup beyond the IPA:

1. **Stripe approval** — apply at [stripe.com/tap-to-pay](https://stripe.com/tap-to-pay)
2. **Apple entitlement** — `com.apple.developer.proximity-reader.payment.acceptance`
   - Requires paid Apple Developer account ($99/year)
   - Apply through [Apple's Tap to Pay program](https://developer.apple.com/tap-to-pay/)
3. **Signed build** — unsigned IPA cannot use Tap to Pay entitlement

For testing without entitlements, enable **Simulated Reader** in Settings → Tap to Pay.

## Architecture

```
TapFlowPOS/
├── App/
│   ├── TapFlowPOSApp.swift      # @main entry point
│   └── ContentView.swift         # Root auth/main routing
├── Models/
│   ├── APIModels.swift           # All API types
│   └── CartModel.swift           # Cart state (ObservableObject)
├── Services/
│   ├── APIService.swift          # HTTP client (async/await)
│   ├── AuthService.swift         # Auth state + Keychain
│   └── TerminalService.swift     # Stripe Terminal wrapper
├── Views/
│   ├── Auth/LoginView.swift      # Login screen
│   ├── POS/
│   │   ├── POSView.swift         # Main POS screen
│   │   ├── ProductGridView.swift # Product tiles
│   │   ├── CartView.swift        # Cart sidebar/drawer
│   │   ├── CheckoutView.swift    # Payment method selection
│   │   ├── TapToPayView.swift    # Stripe Terminal flow
│   │   └── CustomerPickerView.swift
│   ├── Dashboard/
│   │   ├── OrdersListView.swift
│   │   ├── ProductsListView.swift
│   │   └── SettingsView.swift
│   └── Shared/Extensions.swift   # Decimal formatting, haptics
└── Info.plist
```

## Dependencies

| Package | Purpose |
|---|---|
| [StripeTerminal](https://github.com/stripe/stripe-terminal-ios) | In-person payments, Tap to Pay on iPhone |
| [Kingfisher](https://github.com/onevcat/Kingfisher) | Async image loading for product photos |
