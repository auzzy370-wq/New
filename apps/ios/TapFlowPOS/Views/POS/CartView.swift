import SwiftUI

struct CartView: View {
    @EnvironmentObject var cartService: CartService
    let onCheckout: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Cart header
            HStack {
                Text("Cart")
                    .font(.system(size: 17, weight: .semibold))
                Spacer()
                if !cartService.isEmpty {
                    Text("\(cartService.itemCount) item\(cartService.itemCount == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemBackground))

            Divider()

            if cartService.isEmpty {
                // Empty state
                VStack(spacing: 12) {
                    Image(systemName: "cart")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary.opacity(0.4))
                    Text("Cart is empty")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("Tap a product to add it")
                        .font(.caption)
                        .foregroundColor(.secondary.opacity(0.6))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(.systemGroupedBackground))
            } else {
                // Cart items
                List {
                    ForEach(cartService.items) { item in
                        CartItemRow(item: item)
                    }
                    .onDelete { offsets in
                        cartService.removeItem(at: offsets)
                    }
                }
                .listStyle(.plain)

                Divider()

                // Totals
                VStack(spacing: 0) {
                    CartTotalRow(label: "Subtotal", value: cartService.subtotal)

                    if cartService.orderDiscount > 0 {
                        CartTotalRow(label: "Discount", value: -cartService.orderDiscount, color: .green)
                    }

                    CartTotalRow(
                        label: "Tax (\(cartService.taxRate.percentFormatted))",
                        value: cartService.taxAmount
                    )

                    if cartService.tipAmount > 0 {
                        CartTotalRow(label: "Tip", value: cartService.tipAmount)
                    }

                    Divider()
                        .padding(.vertical, 8)

                    HStack {
                        Text("Total")
                            .font(.system(size: 16, weight: .bold))
                        Spacer()
                        Text(cartService.total.currencyFormatted)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.blue)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)

                    // Checkout button
                    Button(action: onCheckout) {
                        HStack {
                            Image(systemName: "creditcard.fill")
                            Text("Charge \(cartService.total.currencyFormatted)")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(14)
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 12)
                }
                .background(Color(.systemBackground))
            }
        }
    }
}

struct CartItemRow: View {
    @EnvironmentObject var cartService: CartService
    let item: CartItem
    @State private var quantity: Int

    init(item: CartItem) {
        self.item = item
        _quantity = State(initialValue: item.quantity)
    }

    var body: some View {
        HStack(spacing: 10) {
            // Quantity stepper
            HStack(spacing: 0) {
                Button(action: decrementQuantity) {
                    Image(systemName: quantity == 1 ? "trash" : "minus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(quantity == 1 ? .red : .blue)
                        .frame(width: 28, height: 28)
                }

                Text("\(quantity)")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(width: 28)
                    .multilineTextAlignment(.center)

                Button(action: incrementQuantity) {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.blue)
                        .frame(width: 28, height: 28)
                }
            }
            .background(Color(.systemFill))
            .cornerRadius(8)

            // Name
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.system(size: 14, weight: .medium))
                    .lineLimit(1)
                Text("\(item.unitPrice.currencyFormatted) each")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(item.lineTotal.currencyFormatted)
                .font(.system(size: 14, weight: .semibold))
        }
        .padding(.vertical, 4)
    }

    private func decrementQuantity() {
        if quantity > 1 {
            quantity -= 1
            cartService.updateQuantity(for: item, quantity: quantity)
        } else {
            cartService.removeItem(item)
        }
    }

    private func incrementQuantity() {
        quantity += 1
        cartService.updateQuantity(for: item, quantity: quantity)
    }
}

struct CartTotalRow: View {
    let label: String
    let value: Decimal
    var color: Color = .primary

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value.currencyFormatted)
                .font(.subheadline)
                .foregroundColor(color)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
    }
}
