import SwiftUI
import StripeTerminal

struct TapToPayView: View {
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var cartService: CartService
    @ObservedObject private var terminalService = TerminalService.shared

    let onComplete: (String) -> Void
    let onCancel: () -> Void

    @State private var phase: TapToPayPhase = .connecting
    @State private var errorMessage: String?

    enum TapToPayPhase {
        case connecting
        case connected
        case creatingIntent
        case waitingForTap
        case processing
        case done(String)
        case failed(String)
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Amount
            VStack(spacing: 4) {
                Text("Charge")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(cartService.total.currencyFormatted)
                    .font(.system(size: 48, weight: .bold, design: .rounded))
            }
            .padding(.bottom, 40)

            // Status indicator
            ZStack {
                Circle()
                    .fill(phaseColor.opacity(0.1))
                    .frame(width: 140, height: 140)

                Circle()
                    .stroke(phaseColor.opacity(0.3), lineWidth: 2)
                    .frame(width: 140, height: 140)
                    .scaleEffect(animating ? 1.3 : 1.0)
                    .opacity(animating ? 0 : 1)
                    .animation(.easeOut(duration: 1.2).repeatForever(autoreverses: false), value: animating)

                VStack(spacing: 8) {
                    Image(systemName: phaseIcon)
                        .font(.system(size: 44))
                        .foregroundColor(phaseColor)
                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
            }
            .padding(.bottom, 24)

            Text(phaseLabel)
                .font(.system(size: 17, weight: .semibold))
                .multilineTextAlignment(.center)

            Text(phaseSubtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .padding(.top, 6)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.top, 8)
            }

            Spacer()

            // Actions
            VStack(spacing: 12) {
                if case .failed = phase {
                    Button(action: { Task { await startPaymentFlow() } }) {
                        Text("Try Again")
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(14)
                    }
                    .padding(.horizontal)
                }

                Button(action: cancel) {
                    Text("Cancel")
                        .foregroundColor(.secondary)
                }
                .padding(.bottom, 20)
            }
        }
        .task { await startPaymentFlow() }
        .onDisappear { terminalService.cancelCollection() }
    }

    // MARK: - UI Helpers

    @State private var animating = false

    private var phaseColor: Color {
        switch phase {
        case .connecting, .connected, .creatingIntent: return .blue
        case .waitingForTap: return .blue
        case .processing: return .orange
        case .done: return .green
        case .failed: return .red
        }
    }

    private var phaseIcon: String {
        switch phase {
        case .connecting: return "wifi"
        case .connected: return "checkmark.circle"
        case .creatingIntent: return "creditcard"
        case .waitingForTap: return "wave.3.right.circle.fill"
        case .processing: return "arrow.triangle.2.circlepath"
        case .done: return "checkmark.circle.fill"
        case .failed: return "exclamationmark.triangle"
        }
    }

    private var phaseLabel: String {
        switch phase {
        case .connecting: return "Connecting..."
        case .connected: return "Ready"
        case .creatingIntent: return "Preparing Payment"
        case .waitingForTap: return "Ready to Accept Payment"
        case .processing: return "Processing..."
        case .done: return "Payment Accepted"
        case .failed: return "Payment Failed"
        }
    }

    private var phaseSubtitle: String {
        switch phase {
        case .connecting: return "Setting up Tap to Pay"
        case .connected: return "Terminal ready"
        case .creatingIntent: return "Creating payment request"
        case .waitingForTap: return "Hold the card or device\nnear the back of your iPhone"
        case .processing: return "Do not move your phone"
        case .done: return "Transaction approved"
        case .failed(let msg): return msg
        }
    }

    private var isLoading: Bool {
        switch phase {
        case .connecting, .creatingIntent, .processing: return true
        default: return false
        }
    }

    // MARK: - Flow

    @MainActor
    private func startPaymentFlow() async {
        // If no location, try one reload before giving up
        if authService.selectedLocation == nil {
            await authService.reloadLocations()
        }
        guard let locationId = authService.selectedLocation?.id else {
            phase = .failed("No location found. Check Settings → Server URL and ensure you are logged in as a merchant.")
            return
        }

        errorMessage = nil

        // Step 1: Connect terminal
        phase = .connecting
        do {
            if case .disconnected = terminalService.connectionState {
                try await terminalService.connectTapToPay(locationId: locationId)
            }
            phase = .connected
        } catch {
            phase = .failed("Could not connect: \(error.localizedDescription)")
            return
        }

        // Step 2: Create order
        phase = .creatingIntent
        let orderRequest = cartService.buildOrderRequest(locationId: locationId)
        do {
            let order = try await APIService.shared.createOrder(orderRequest)

            // Step 3: Create payment intent on backend
            let paymentRequest = CreatePaymentRequest(
                orderId: order.id,
                amount: NSDecimalNumber(decimal: cartService.total * 100).intValue,
                currency: "usd",
                paymentMethod: "TAP_TO_PAY",
                idempotencyKey: UUID().uuidString
            )
            let intentResponse = try await APIService.shared.createPaymentIntent(paymentRequest)

            guard let clientSecret = intentResponse.clientSecret,
                  let stripeIntentId = intentResponse.stripePaymentIntentId else {
                phase = .failed("Invalid payment intent from server")
                return
            }

            // Step 4: Collect via Terminal
            phase = .waitingForTap
            withAnimation(.easeOut(duration: 1.2).repeatForever(autoreverses: false)) {
                animating = true
            }

            let processedIntentId = try await terminalService.collectPayment(
                paymentIntentClientSecret: clientSecret,
                stripePaymentIntentId: stripeIntentId
            )

            // Step 5: Confirm with backend
            phase = .processing
            animating = false

            let confirmedOrder = try await APIService.shared.confirmPaymentIntent(
                paymentIntentId: intentResponse.id,
                stripePaymentIntentId: processedIntentId
            )

            phase = .done(confirmedOrder.id)
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)

            // Auto-advance to success
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            onComplete(confirmedOrder.id)

        } catch {
            animating = false
            let msg = error.localizedDescription
            if msg.contains("No Stripe account") || msg.contains("stripeAccountId") {
                phase = .failed("Stripe Connect not configured. In the Dashboard, complete merchant onboarding to enable live payments.")
            } else {
                phase = .failed(msg)
            }
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)
        }
    }

    private func cancel() {
        terminalService.cancelCollection()
        onCancel()
    }
}
