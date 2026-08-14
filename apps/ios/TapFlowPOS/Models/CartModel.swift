import Foundation
import Combine

// MARK: - Cart Item (product-based)

struct CartItem: Identifiable, Equatable {
    let id = UUID()
    let product: APIProduct
    let variant: APIProductVariant?
    var quantity: Int
    var modifiers: [String]
    var itemDiscount: Decimal

    var unitPrice: Decimal {
        variant?.price ?? product.price
    }

    var lineTotal: Decimal {
        (unitPrice * Decimal(quantity)) - itemDiscount
    }

    var name: String {
        if let variant = variant {
            return "\(product.name) – \(variant.name)"
        }
        return product.name
    }

    static func == (lhs: CartItem, rhs: CartItem) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Custom Cart Item (free-form amount)

struct CustomCartItem: Identifiable, Equatable {
    let id = UUID()
    var description: String
    var amount: Decimal  // pre-tax dollars

    var lineTotal: Decimal { amount }

    static func == (lhs: CustomCartItem, rhs: CustomCartItem) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Cart Service

final class CartService: ObservableObject {
    static let shared = CartService()

    @Published var items: [CartItem] = []
    @Published var customItems: [CustomCartItem] = []
    @Published var orderDiscount: Decimal = 0
    @Published var selectedCustomer: APICustomer?
    @Published var tipAmount: Decimal = 0
    @Published var notes: String = ""
    @Published var taxRate: Decimal = 0.0875

    private init() {}

    // MARK: - Computed totals

    var itemCount: Int { items.reduce(0) { $0 + $1.quantity } + customItems.count }

    var subtotal: Decimal {
        let productSubtotal = items.reduce(Decimal(0)) { $0 + $1.lineTotal }
        let customSubtotal = customItems.reduce(Decimal(0)) { $0 + $1.lineTotal }
        return productSubtotal + customSubtotal
    }

    var taxAmount: Decimal {
        (subtotal - orderDiscount) * taxRate
    }

    var total: Decimal {
        subtotal - orderDiscount + taxAmount + tipAmount
    }

    var isEmpty: Bool { items.isEmpty && customItems.isEmpty }

    // MARK: - Mutations

    func addProduct(_ product: APIProduct, variant: APIProductVariant? = nil, quantity: Int = 1) {
        if let idx = items.firstIndex(where: { $0.product.id == product.id && $0.variant?.id == variant?.id }) {
            items[idx].quantity += quantity
        } else {
            let item = CartItem(product: product, variant: variant, quantity: quantity, modifiers: [], itemDiscount: 0)
            items.append(item)
        }
    }

    func removeItem(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
    }

    func removeItem(_ item: CartItem) {
        items.removeAll { $0.id == item.id }
    }

    func updateQuantity(for item: CartItem, quantity: Int) {
        if let idx = items.firstIndex(where: { $0.id == item.id }) {
            if quantity <= 0 {
                items.remove(at: idx)
            } else {
                items[idx].quantity = quantity
            }
        }
    }

    func addCustomItem(description: String = "Custom Charge", amount: Decimal) {
        customItems.append(CustomCartItem(description: description, amount: amount))
    }

    func removeCustomItem(_ item: CustomCartItem) {
        customItems.removeAll { $0.id == item.id }
    }

    func setDiscount(_ amount: Decimal) {
        orderDiscount = min(amount, subtotal)
    }

    func setTip(_ amount: Decimal) {
        tipAmount = amount
    }

    func setTaxRate(_ rate: Decimal) {
        taxRate = rate
    }

    func setCustomer(_ customer: APICustomer?) {
        selectedCustomer = customer
    }

    func clear() {
        items = []
        customItems = []
        orderDiscount = 0
        tipAmount = 0
        notes = ""
        selectedCustomer = nil
    }

    // MARK: - Order creation payload

    func buildOrderRequest(locationId: String) -> CreateOrderRequest {
        let productOrderItems = items.map { item in
            let lineTotal = item.lineTotal
            let itemTax = item.product.isTaxable ? (lineTotal * taxRate) : 0
            return CreateOrderItem(
                productId: item.product.id,
                variantId: item.variant?.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: item.itemDiscount > 0 ? item.itemDiscount : nil,
                taxAmount: itemTax,
                total: lineTotal + itemTax,
                name: item.name,
                modifiers: item.modifiers.isEmpty ? nil : item.modifiers
            )
        }

        let customOrderItems = customItems.map { item in
            let itemTax = item.amount * taxRate
            return CreateOrderItem(
                productId: nil,
                variantId: nil,
                quantity: 1,
                unitPrice: item.amount,
                discountAmount: nil,
                taxAmount: itemTax,
                total: item.amount + itemTax,
                name: item.description,
                modifiers: nil
            )
        }

        let orderItems = productOrderItems + customOrderItems

        return CreateOrderRequest(
            locationId: locationId,
            customerId: selectedCustomer?.id,
            items: orderItems,
            discountAmount: orderDiscount > 0 ? orderDiscount : nil,
            taxAmount: taxAmount,
            tipAmount: tipAmount,
            subtotal: subtotal,
            total: total,
            notes: notes.isEmpty ? nil : notes,
            idempotencyKey: UUID().uuidString
        )
    }
}
