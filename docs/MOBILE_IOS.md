# iOS POS App - Implementation Guide

## Overview

The TapFlow POS iOS app is a native Swift/SwiftUI application that uses the official Stripe Terminal iOS SDK for all card-present payments, including Tap to Pay on iPhone.

---

## Requirements

| Requirement | Value |
|---|---|
| iOS Deployment Target | iOS 16.0+ |
| Xcode | 15.0+ |
| Swift | 5.9+ |
| Device | iPhone XS or later (for Tap to Pay) |
| Stripe Terminal SDK | [stripe/stripe-terminal-ios](https://github.com/stripe/stripe-terminal-ios) |

---

## Apple Entitlements Required

**IMPORTANT**: Tap to Pay on iPhone requires explicit approval from both Apple and Stripe before you can use it in production.

### Steps to Get Entitlement:
1. Apply at: https://developer.apple.com/tap-to-pay-on-iphone/
2. Complete the Tap to Pay on iPhone addendum with Apple
3. Get Stripe's approval for Tap to Pay on iPhone
4. After approval, Apple adds the entitlement to your provisioning profile

### Required Entitlement:
```xml
<!-- Entitlements.plist -->
<key>com.apple.developer.proximity-reader.payment.acceptance</key>
<true/>
```

### Info.plist Required:
```xml
<key>NSProximityReaderUsageDescription</key>
<string>TapFlow POS uses NFC to accept contactless card payments.</string>
```

---

## Installation (SPM)

```swift
// Package.swift or Xcode Package Dependencies:
.package(url: "https://github.com/stripe/stripe-terminal-ios", from: "3.0.0")
```

---

## Project Structure

```
TapFlowPOS/
├── App/
│   ├── TapFlowPOSApp.swift
│   └── ContentView.swift
├── Features/
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── AuthService.swift
│   ├── POS/
│   │   ├── POSView.swift           ← Main POS screen
│   │   ├── ProductGridView.swift
│   │   ├── CartView.swift
│   │   └── CheckoutView.swift
│   ├── Terminal/
│   │   ├── TerminalManager.swift   ← Stripe Terminal singleton
│   │   ├── ConnectionTokenProvider.swift
│   │   └── PaymentProcessor.swift
│   └── Dashboard/
│       └── DashboardView.swift
├── Network/
│   ├── APIClient.swift
│   └── Models/
└── Utilities/
```

---

## Core Implementation

### ConnectionTokenProvider

```swift
import StripeTerminal

// The connection token provider fetches a token from YOUR backend.
// The backend calls stripe.terminal.connectionTokens.create()
// NEVER generate the token client-side.

class ConnectionTokenProvider: NSObject, ConnectionTokenProvider {
    let apiClient: APIClient
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
        super.init()
    }
    
    func fetchConnectionToken(_ completion: @escaping ConnectionTokenCompletionBlock) {
        Task {
            do {
                let response = try await apiClient.post(
                    path: "/devices/connection-token",
                    body: ["locationId": TerminalManager.shared.locationId ?? ""]
                )
                let secret = response["secret"] as? String ?? ""
                completion(secret, nil)
            } catch {
                completion(nil, error)
            }
        }
    }
}
```

### TerminalManager

```swift
import StripeTerminal
import Combine

@MainActor
class TerminalManager: NSObject, ObservableObject {
    static let shared = TerminalManager()
    
    @Published var connectionStatus: ConnectionStatus = .notConnected
    @Published var paymentStatus: PaymentIntentStatus?
    @Published var isCollectingPayment = false
    @Published var error: Error?
    
    var locationId: String?
    private var currentPaymentIntent: PaymentIntent?
    
    private override init() {
        super.init()
    }
    
    // Call this after user logs in
    func initialize(connectionTokenProvider: ConnectionTokenProvider) {
        Terminal.setTokenProvider(connectionTokenProvider)
        Terminal.shared.delegate = self
    }
    
    // Discover readers / Tap to Pay
    func discoverReaders() async throws {
        // For Tap to Pay on iPhone:
        let config = try LocalMobileDiscoveryConfiguration(simulated: false)
        let cancelable = Terminal.shared.discoverReaders(config, delegate: self) { error in
            if let error { print("Discovery error: \(error)") }
        }
    }
    
    // Connect to Tap to Pay reader
    func connectLocalMobileReader(_ reader: Reader) async throws {
        let params = LocalMobileConnectionParameters(reader: reader)
        let connectedReader = try await Terminal.shared.connectLocalMobileReader(params, delegate: self)
        print("Connected to: \(connectedReader.label ?? "Tap to Pay reader")")
    }
    
    // Process a payment
    func processPayment(clientSecret: String) async throws -> PaymentIntent {
        isCollectingPayment = true
        defer { isCollectingPayment = false }
        
        // Retrieve payment intent
        let paymentIntent = try await Terminal.shared.retrievePaymentIntent(clientSecret: clientSecret)
        currentPaymentIntent = paymentIntent
        
        // Collect payment method (shows Tap to Pay UI)
        let collectedIntent = try await withCheckedThrowingContinuation { continuation in
            Terminal.shared.collectPaymentMethod(paymentIntent) { intent, error in
                if let error { continuation.resume(throwing: error) }
                else if let intent { continuation.resume(returning: intent) }
            }
        }
        
        // Process payment
        let processedIntent = try await withCheckedThrowingContinuation { continuation in
            Terminal.shared.processPayment(collectedIntent) { intent, error in
                if let error { continuation.resume(throwing: error) }
                else if let intent { continuation.resume(returning: intent) }
            }
        }
        
        return processedIntent
    }
    
    // Cancel ongoing payment collection
    func cancelPayment() {
        Terminal.shared.cancelCollectPaymentMethod { _ in }
    }
}

// MARK: - TerminalDelegate
extension TerminalManager: TerminalDelegate {
    nonisolated func terminal(_ terminal: Terminal, didChangeConnectionStatus status: ConnectionStatus) {
        Task { @MainActor in self.connectionStatus = status }
    }
    
    nonisolated func terminal(_ terminal: Terminal, didReportUnexpectedReaderDisconnect reader: Reader) {
        Task { @MainActor in self.connectionStatus = .notConnected }
    }
}

// MARK: - DiscoveryDelegate
extension TerminalManager: DiscoveryDelegate {
    nonisolated func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {
        // Auto-connect to first available reader
        guard let reader = readers.first else { return }
        Task {
            try await TerminalManager.shared.connectLocalMobileReader(reader)
        }
    }
}

// MARK: - LocalMobileReaderDelegate
extension TerminalManager: LocalMobileReaderDelegate {
    nonisolated func localMobileReader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {}
    nonisolated func localMobileReader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {}
    nonisolated func localMobileReader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {}
    nonisolated func localMobileReader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions) {}
    nonisolated func localMobileReader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {}
    nonisolated func localMobileReaderDidAcceptTermsOfService(_ reader: Reader) {}
}
```

### Payment Flow in CheckoutView

```swift
struct CheckoutView: View {
    @StateObject var terminal = TerminalManager.shared
    let order: Order
    let apiClient: APIClient
    
    @State private var paymentStatus: String = "ready"
    @State private var isProcessing = false
    
    var body: some View {
        VStack(spacing: 24) {
            // Amount display
            Text(order.total.formatted(.currency(code: "USD")))
                .font(.system(size: 48, weight: .bold))
            
            // Status
            statusView
            
            // Tap to Pay button
            if terminal.connectionStatus == .connected {
                Button(action: processPayment) {
                    HStack {
                        Image(systemName: "wave.3.right.circle.fill")
                        Text("Tap to Pay")
                    }
                    .font(.title2.bold())
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(16)
                }
                .disabled(isProcessing)
            } else {
                ProgressView("Connecting to reader...")
            }
        }
        .padding()
        .onAppear { setupTerminal() }
    }
    
    func processPayment() {
        guard !isProcessing else { return }
        isProcessing = true
        paymentStatus = "creating"
        
        Task {
            do {
                // 1. Create payment intent on our backend
                let intentResponse = try await apiClient.post(
                    path: "/payments/create",
                    body: [
                        "orderId": order.id,
                        "paymentMethod": "TAP_TO_PAY"
                    ],
                    idempotencyKey: "pi-\(order.id)-\(UUID().uuidString)"
                )
                
                let clientSecret = intentResponse["clientSecret"] as! String
                let paymentIntentId = intentResponse["paymentIntentId"] as! String
                
                paymentStatus = "tap_card"
                
                // 2. Process through Terminal SDK
                let processedIntent = try await terminal.processPayment(clientSecret: clientSecret)
                
                paymentStatus = "confirming"
                
                // 3. Confirm with our backend
                try await apiClient.post(
                    path: "/payments/confirm/\(paymentIntentId)",
                    body: [:]
                )
                
                paymentStatus = "succeeded"
            } catch {
                paymentStatus = "failed"
                print("Payment error: \(error)")
            }
            
            isProcessing = false
        }
    }
}
```

---

## Offline Mode

The iOS app supports limited offline functionality:

| Feature | Offline Support |
|---|---|
| Browse products | ✅ (cached in CoreData) |
| Build cart | ✅ |
| View customers | ✅ (cached) |
| Create draft orders | ✅ |
| Cash payments | ✅ |
| Card / Tap to Pay | ❌ Requires internet |

When offline and user attempts card payment:
```swift
// Show clear message:
"Card payments require an internet connection.
Cash payments are available offline."
```

---

## Build & Signing Requirements

1. **Apple Developer Account**: Required ($99/year)
2. **App ID**: Create with Tap to Pay entitlement
3. **Provisioning Profile**: Must include Tap to Pay entitlement (after Apple approval)
4. **Distribution Certificate**: Required for App Store submission

---

## App Store Submission

Payment-related apps receive additional scrutiny from Apple:

1. Clearly explain payment functionality in app description
2. Include demo account credentials for review
3. Add Privacy Manifest (PrivacyInfo.xcprivacy)
4. Complete App Privacy Report accurately
5. Contact Apple DTS if review questions arise about Tap to Pay
