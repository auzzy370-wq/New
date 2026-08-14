import SwiftUI

/// Full-screen custom charge entry — a clean numpad the merchant taps to enter any dollar amount,
/// then proceeds directly to checkout (Tap to Pay or cash).
struct CustomAmountView: View {
    @EnvironmentObject var cartService: CartService
    @Environment(\.dismiss) var dismiss

    @State private var digits: String = ""          // raw digit string e.g. "2500" = $25.00
    @State private var description: String = "Custom Charge"
    @State private var showCheckout = false
    @State private var editingDescription = false

    private var displayAmount: String {
        let cents = Int(digits) ?? 0
        let dollars = Double(cents) / 100.0
        return String(format: "$%.2f", dollars)
    }

    private var decimalAmount: Decimal {
        let cents = Int(digits) ?? 0
        return Decimal(cents) / 100
    }

    private var hasAmount: Bool {
        (Int(digits) ?? 0) > 0
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // ── Amount display ──────────────────────────────────
                VStack(spacing: 8) {
                    Text(displayAmount)
                        .font(.system(size: 64, weight: .bold, design: .rounded))
                        .foregroundColor(hasAmount ? .primary : .secondary.opacity(0.4))
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                        .padding(.top, 32)

                    // Description label (tap to edit)
                    Button(action: { editingDescription = true }) {
                        HStack(spacing: 4) {
                            Text(description)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Image(systemName: "pencil")
                                .font(.caption2)
                                .foregroundColor(.secondary.opacity(0.6))
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 24)

                Divider()

                // ── Numpad ──────────────────────────────────────────
                numpad
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)

                // ── Charge button ───────────────────────────────────
                Button(action: addToCartAndCheckout) {
                    HStack(spacing: 10) {
                        Image(systemName: "wave.3.right.circle.fill")
                            .font(.system(size: 20))
                        Text(hasAmount ? "Charge \(displayAmount)" : "Enter Amount")
                            .font(.system(size: 19, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 58)
                    .background(hasAmount ? Color.blue : Color.gray.opacity(0.3))
                    .foregroundColor(.white)
                    .cornerRadius(16)
                }
                .disabled(!hasAmount)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

                Button(action: { dismiss() }) {
                    Text("Cancel")
                        .foregroundColor(.secondary)
                        .padding(.vertical, 12)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Custom Charge")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showCheckout, onDismiss: {
                // If checkout was closed without completing, remove the custom item we added
                cartService.customItems.removeAll()
                dismiss()
            }) {
                CheckoutView()
                    .environmentObject(cartService)
                    .environmentObject(AuthService.shared)
            }
            .alert("Label", isPresented: $editingDescription) {
                TextField("Custom Charge", text: $description)
                Button("Done") {}
            } message: {
                Text("What is this charge for?")
            }
        }
    }

    // MARK: - Numpad grid

    private var numpad: some View {
        let rows: [[String]] = [
            ["7", "8", "9"],
            ["4", "5", "6"],
            ["1", "2", "3"],
            [".", "0", "⌫"]
        ]
        return VStack(spacing: 10) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: 10) {
                    ForEach(row, id: \.self) { key in
                        NumpadKey(label: key) {
                            handleKey(key)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Key logic

    private func handleKey(_ key: String) {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()

        switch key {
        case "⌫":
            if !digits.isEmpty { digits.removeLast() }
        case ".":
            break  // cents are implicit; ignore decimal point
        default:
            guard digits.count < 7 else { return }  // max $99,999.99
            if digits == "0" { digits = key } else { digits += key }
        }
    }

    // MARK: - Checkout

    private func addToCartAndCheckout() {
        cartService.addCustomItem(description: description, amount: decimalAmount)
        showCheckout = true
    }
}

// MARK: - Numpad Key

struct NumpadKey: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.06), radius: 3, y: 1)

                if label == "⌫" {
                    Image(systemName: "delete.left")
                        .font(.system(size: 22))
                        .foregroundColor(.primary)
                } else {
                    Text(label)
                        .font(.system(size: 28, weight: .medium, design: .rounded))
                        .foregroundColor(.primary)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 72)
        }
        .buttonStyle(.plain)
    }
}
