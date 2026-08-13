import SwiftUI

enum CheckoutStep {
    case selectPayment
    case tapToPay
    case cash
    case processing
    case success(String) // order ID
    case failure(String)
}

struct CheckoutView: View {
    @EnvironmentObject var cartService: CartService
    @EnvironmentObject var authService: AuthService
    @Environment(\.dismiss) var dismiss

    @State private var step: CheckoutStep = .selectPayment
    @State private var showTipSheet = false
    @State private var showDiscountSheet = false
    @State private var discountInput = ""
    @State private var cashGiven = ""
    @State private var isProcessing = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                switch step {
                case .selectPayment:
                    selectPaymentView
                case .tapToPay:
                    TapToPayView(onComplete: { orderId in
                        step = .success(orderId)
                    }, onCancel: {
                        step = .selectPayment
                    })
                case .cash:
                    cashPaymentView
                case .processing:
                    processingView
                case .success(let orderId):
                    successView(orderId: orderId)
                case .failure(let message):
                    failureView(message: message)
                }
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if canDismiss {
                        Button("Close") { dismiss() }
                    }
                }
            }
        }
    }

    // MARK: - Select Payment

    private var selectPaymentView: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Order summary
                orderSummaryCard

                // Tip
                Button(action: { showTipSheet = true }) {
                    HStack {
                        Image(systemName: "hand.thumbsup")
                        Text(cartService.tipAmount > 0 ? "Tip: \(cartService.tipAmount.currencyFormatted)" : "Add Tip")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                }
                .foregroundColor(.primary)

                // Discount
                Button(action: { showDiscountSheet = true }) {
                    HStack {
                        Image(systemName: "tag")
                        Text(cartService.orderDiscount > 0 ? "Discount: \(cartService.orderDiscount.currencyFormatted)" : "Add Discount")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                }
                .foregroundColor(.primary)

                // Total
                HStack {
                    Text("Total")
                        .font(.system(size: 18, weight: .bold))
                    Spacer()
                    Text(cartService.total.currencyFormatted)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.blue)
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)

                // Payment methods
                VStack(spacing: 10) {
                    Text("Choose Payment Method")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PaymentMethodButton(
                        icon: "wave.3.right.circle.fill",
                        title: "Tap to Pay",
                        subtitle: "iPhone contactless",
                        color: .blue,
                        isAvailable: TerminalService.shared.isTapToPaySupported
                    ) {
                        step = .tapToPay
                    }

                    PaymentMethodButton(
                        icon: "banknote",
                        title: "Cash",
                        subtitle: "Manual entry",
                        color: .green
                    ) {
                        step = .cash
                    }
                }
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
        .sheet(isPresented: $showTipSheet) {
            TipSheet()
                .environmentObject(cartService)
        }
        .sheet(isPresented: $showDiscountSheet) {
            DiscountSheet()
                .environmentObject(cartService)
        }
    }

    // MARK: - Cash Payment

    private var cashPaymentView: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("Total Due")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(cartService.total.currencyFormatted)
                    .font(.system(size: 44, weight: .bold))
                    .foregroundColor(.primary)
            }
            .padding(.top, 32)

            VStack(spacing: 8) {
                Text("Cash Received")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                TextField("$0.00", text: $cashGiven)
                    .font(.system(size: 32, weight: .semibold))
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.center)
                    .padding()
                    .background(Color(.systemFill))
                    .cornerRadius(14)
                    .padding(.horizontal)
            }

            if let change = calculateChange() {
                HStack {
                    Text("Change")
                        .font(.headline)
                    Spacer()
                    Text(change.currencyFormatted)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(change >= 0 ? .green : .red)
                }
                .padding(.horizontal, 32)
            }

            Spacer()

            VStack(spacing: 12) {
                Button(action: processCashPayment) {
                    HStack {
                        if isProcessing {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                        }
                        Text("Complete Cash Sale")
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(canConfirmCash ? Color.green : Color.gray.opacity(0.4))
                    .foregroundColor(.white)
                    .cornerRadius(14)
                }
                .disabled(!canConfirmCash || isProcessing)
                .padding(.horizontal)

                Button("Back") { step = .selectPayment }
                    .foregroundColor(.secondary)
                    .padding(.bottom, 16)
            }
        }
    }

    // MARK: - Processing View

    private var processingView: some View {
        VStack(spacing: 24) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
            Text("Processing payment...")
                .font(.headline)
                .foregroundColor(.secondary)
            Spacer()
        }
    }

    // MARK: - Success View

    private func successView(orderId: String) -> some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.1))
                    .frame(width: 100, height: 100)
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.green)
            }

            VStack(spacing: 8) {
                Text("Payment Successful!")
                    .font(.system(size: 24, weight: .bold))
                Text(cartService.total.currencyFormatted)
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.green)
            }

            Spacer()

            VStack(spacing: 12) {
                Button(action: {
                    cartService.clear()
                    dismiss()
                }) {
                    Text("New Sale")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(14)
                }
                .padding(.horizontal)

                Button(action: {
                    // TODO: Print/email receipt
                    cartService.clear()
                    dismiss()
                }) {
                    Label("Send Receipt", systemImage: "envelope")
                        .foregroundColor(.blue)
                }
                .padding(.bottom, 16)
            }
        }
    }

    // MARK: - Failure View

    private func failureView(message: String) -> some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 64))
                .foregroundColor(.red)
            VStack(spacing: 8) {
                Text("Payment Failed")
                    .font(.system(size: 24, weight: .bold))
                Text(message)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            Spacer()
            VStack(spacing: 12) {
                Button(action: { step = .selectPayment }) {
                    Text("Try Again")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(14)
                }
                .padding(.horizontal)
                Button("Cancel Sale") {
                    dismiss()
                }
                .foregroundColor(.red)
                .padding(.bottom, 16)
            }
        }
    }

    // MARK: - Order Summary

    private var orderSummaryCard: some View {
        VStack(spacing: 4) {
            ForEach(cartService.items) { item in
                HStack {
                    Text("\(item.quantity)× \(item.name)")
                        .font(.subheadline)
                        .lineLimit(1)
                    Spacer()
                    Text(item.lineTotal.currencyFormatted)
                        .font(.subheadline)
                }
            }
            Divider().padding(.vertical, 4)
            HStack {
                Text("Subtotal")
                    .foregroundColor(.secondary)
                    .font(.caption)
                Spacer()
                Text(cartService.subtotal.currencyFormatted)
                    .font(.caption)
            }
            HStack {
                Text("Tax")
                    .foregroundColor(.secondary)
                    .font(.caption)
                Spacer()
                Text(cartService.taxAmount.currencyFormatted)
                    .font(.caption)
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Helpers

    private var navigationTitle: String {
        switch step {
        case .selectPayment: return "Checkout"
        case .tapToPay: return "Tap to Pay"
        case .cash: return "Cash Payment"
        case .processing: return "Processing"
        case .success: return "Complete"
        case .failure: return "Failed"
        }
    }

    private var canDismiss: Bool {
        switch step {
        case .processing: return false
        default: return true
        }
    }

    private var canConfirmCash: Bool {
        guard let given = Decimal(string: cashGiven.replacingOccurrences(of: "$", with: "")) else { return false }
        return given >= cartService.total
    }

    private func calculateChange() -> Decimal? {
        guard !cashGiven.isEmpty,
              let given = Decimal(string: cashGiven.replacingOccurrences(of: "$", with: "")) else { return nil }
        return given - cartService.total
    }

    private func processCashPayment() {
        guard let locationId = authService.selectedLocation?.id else { return }
        guard let given = Decimal(string: cashGiven.replacingOccurrences(of: "$", with: "")) else { return }

        isProcessing = true
        step = .processing

        Task {
            do {
                // Create order first
                let orderRequest = cartService.buildOrderRequest(locationId: locationId)
                let order = try await APIService.shared.createOrder(orderRequest)

                // Record cash payment
                let cashRequest = CashPaymentRequest(
                    orderId: order.id,
                    amount: NSDecimalNumber(decimal: cartService.total * 100).intValue,
                    currency: "usd",
                    cashGiven: NSDecimalNumber(decimal: given * 100).intValue,
                    idempotencyKey: UUID().uuidString
                )
                let _ = try await APIService.shared.processCashPayment(cashRequest)
                step = .success(order.id)
            } catch {
                step = .failure(error.localizedDescription)
            }
            isProcessing = false
        }
    }
}

// MARK: - Payment Method Button

struct PaymentMethodButton: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    var isAvailable: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: isAvailable ? action : {}) {
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color.opacity(isAvailable ? 0.15 : 0.06))
                        .frame(width: 48, height: 48)
                    Image(systemName: icon)
                        .font(.system(size: 22))
                        .foregroundColor(isAvailable ? color : .secondary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(isAvailable ? .primary : .secondary)
                    Text(isAvailable ? subtitle : "Not available on this device")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if isAvailable {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(14)
            .opacity(isAvailable ? 1 : 0.6)
        }
        .disabled(!isAvailable)
    }
}

// MARK: - Tip Sheet

struct TipSheet: View {
    @EnvironmentObject var cartService: CartService
    @Environment(\.dismiss) var dismiss
    @State private var customTip = ""

    let presets: [Double] = [0.15, 0.18, 0.20, 0.25]

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text(cartService.subtotal.currencyFormatted)
                    .font(.system(size: 32, weight: .bold))
                    .padding(.top, 20)

                // Preset amounts
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    Button("No Tip") {
                        cartService.setTip(0)
                        dismiss()
                    }
                    .tipButtonStyle(isSelected: cartService.tipAmount == 0, color: .secondary)

                    ForEach(presets, id: \.self) { pct in
                        let amount = cartService.subtotal * Decimal(pct)
                        Button(action: {
                            cartService.setTip(amount)
                            dismiss()
                        }) {
                            VStack(spacing: 2) {
                                Text("\(Int(pct * 100))%")
                                    .font(.system(size: 17, weight: .bold))
                                Text(amount.currencyFormatted)
                                    .font(.caption)
                            }
                        }
                        .tipButtonStyle(isSelected: cartService.tipAmount == amount, color: .blue)
                    }
                }
                .padding(.horizontal)

                // Custom amount
                VStack(spacing: 8) {
                    Text("Custom Amount")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    HStack {
                        Text("$")
                            .font(.system(size: 20, weight: .semibold))
                        TextField("0.00", text: $customTip)
                            .font(.system(size: 20))
                            .keyboardType(.decimalPad)
                    }
                    .padding()
                    .background(Color(.systemFill))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    Button(action: {
                        if let amount = Decimal(string: customTip) {
                            cartService.setTip(amount)
                            dismiss()
                        }
                    }) {
                        Text("Apply Custom Tip")
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(!customTip.isEmpty ? Color.blue : Color.gray.opacity(0.4))
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    .disabled(customTip.isEmpty)
                    .padding(.horizontal)
                }

                Spacer()
            }
            .navigationTitle("Add Tip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

extension View {
    func tipButtonStyle(isSelected: Bool, color: Color) -> some View {
        self
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(isSelected ? color : Color(.systemFill))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(12)
            .font(.system(size: 16, weight: .semibold))
    }
}

// MARK: - Discount Sheet

struct DiscountSheet: View {
    @EnvironmentObject var cartService: CartService
    @Environment(\.dismiss) var dismiss
    @State private var discountType = 0 // 0 = amount, 1 = percent
    @State private var discountValue = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Picker("Discount Type", selection: $discountType) {
                    Text("$ Amount").tag(0)
                    Text("% Percent").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 20)

                HStack {
                    Text(discountType == 0 ? "$" : "%")
                        .font(.system(size: 24, weight: .semibold))
                    TextField("0", text: $discountValue)
                        .font(.system(size: 28))
                        .keyboardType(.decimalPad)
                }
                .padding()
                .background(Color(.systemFill))
                .cornerRadius(14)
                .padding(.horizontal)

                if let amount = computedDiscount {
                    Text("Discount: \(amount.currencyFormatted)")
                        .font(.headline)
                        .foregroundColor(.green)
                }

                Button(action: applyDiscount) {
                    Text("Apply Discount")
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(!discountValue.isEmpty ? Color.green : Color.gray.opacity(0.4))
                        .foregroundColor(.white)
                        .cornerRadius(14)
                }
                .disabled(discountValue.isEmpty)
                .padding(.horizontal)

                Button(action: {
                    cartService.setDiscount(0)
                    dismiss()
                }) {
                    Text("Remove Discount")
                        .foregroundColor(.red)
                }

                Spacer()
            }
            .navigationTitle("Discount")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private var computedDiscount: Decimal? {
        guard let value = Decimal(string: discountValue) else { return nil }
        if discountType == 0 { return value }
        return cartService.subtotal * (value / 100)
    }

    private func applyDiscount() {
        if let amount = computedDiscount {
            cartService.setDiscount(amount)
            dismiss()
        }
    }
}
