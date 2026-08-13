import SwiftUI

struct OrdersListView: View {
    @State private var orders: [APIOrder] = []
    @State private var isLoading = false
    @State private var page = 1

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && orders.isEmpty {
                    ProgressView("Loading orders...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if orders.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary.opacity(0.5))
                        Text("No Orders")
                            .font(.headline)
                        Text("Orders will appear here after your first sale")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                } else {
                    List(orders) { order in
                        NavigationLink(destination: OrderDetailView(order: order)) {
                            OrderRow(order: order)
                        }
                    }
                    .refreshable { await loadOrders(reset: true) }
                }
            }
            .navigationTitle("Orders")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadOrders() }
        }
    }

    private func loadOrders(reset: Bool = false) async {
        if reset { page = 1; orders = [] }
        isLoading = true
        do {
            let response = try await APIService.shared.getOrders(page: page)
            orders = response.items
        } catch {}
        isLoading = false
    }
}

struct OrderRow: View {
    let order: APIOrder

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text("#\(order.orderNumber)")
                    .font(.system(size: 15, weight: .semibold))
                if let customer = order.customer {
                    Text(customer.displayName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Text(formattedDate)
                    .font(.caption2)
                    .foregroundColor(.secondary.opacity(0.7))
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(order.total.currencyFormatted)
                    .font(.system(size: 16, weight: .bold))
                StatusBadge(status: order.status)
            }
        }
        .padding(.vertical, 4)
    }

    private var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: order.createdAt) {
            let display = DateFormatter()
            display.dateStyle = .short
            display.timeStyle = .short
            return display.string(from: date)
        }
        return order.createdAt
    }
}

struct OrderDetailView: View {
    let order: APIOrder

    var body: some View {
        List {
            Section("Summary") {
                LabeledContent("Order #", value: order.orderNumber)
                LabeledContent("Status", value: order.status)
                LabeledContent("Total", value: order.total.currencyFormatted)
                LabeledContent("Tax", value: order.taxAmount.currencyFormatted)
                if let discount = order.discountAmount, discount > 0 {
                    LabeledContent("Discount", value: "-\(discount.currencyFormatted)")
                }
                if order.tipAmount > 0 {
                    LabeledContent("Tip", value: order.tipAmount.currencyFormatted)
                }
            }
            if let customer = order.customer {
                Section("Customer") {
                    LabeledContent("Name", value: customer.displayName)
                    if let email = customer.email {
                        LabeledContent("Email", value: email)
                    }
                }
            }
        }
        .navigationTitle("Order #\(order.orderNumber)")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct StatusBadge: View {
    let status: String

    private var color: Color {
        switch status.uppercased() {
        case "PAID": return .green
        case "PENDING": return .orange
        case "FAILED": return .red
        case "REFUNDED": return .purple
        case "CANCELLED": return .gray
        default: return .blue
        }
    }

    var body: some View {
        Text(status.capitalized)
            .font(.system(size: 11, weight: .semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .cornerRadius(6)
    }
}
