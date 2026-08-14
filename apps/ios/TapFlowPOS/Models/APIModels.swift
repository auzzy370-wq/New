import Foundation

// MARK: - Auth

struct LoginRequest: Encodable {
    let email: String
    let password: String
    let mfaCode: String?
}

struct LoginResponse: Decodable {
    let user: APIUser
    let accessToken: String
    let merchant: APIMerchantSummary?
}

struct APIUser: Decodable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let role: String?
    var displayName: String { "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces) }
}

struct APIMerchantSummary: Decodable, Identifiable {
    let id: String
    let name: String
    let status: String
    let currency: String?
    let stripeChargesEnabled: Bool?
}

// MARK: - Products

struct APIProduct: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String?
    let sku: String?
    let barcode: String?
    let price: Decimal
    let cost: Decimal?
    let imageUrl: String?
    let isActive: Bool
    let isTaxable: Bool
    let trackInventory: Bool
    let categoryId: String?
    let category: APICategory?
    let variants: [APIProductVariant]?

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: APIProduct, rhs: APIProduct) -> Bool { lhs.id == rhs.id }
}

struct APIProductVariant: Decodable, Identifiable {
    let id: String
    let name: String
    let sku: String?
    let price: Decimal
    let inventory: [APIInventory]?
}

struct APICategory: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let color: String?
    let sortOrder: Int?
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: APICategory, rhs: APICategory) -> Bool { lhs.id == rhs.id }
}

struct APIInventory: Decodable {
    let quantity: Int
    let lowStockThreshold: Int?
}

// MARK: - Customers

struct APICustomer: Decodable, Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String?
    let phone: String?
    let totalSpent: Decimal?
    let orderCount: Int?
    var displayName: String { "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces) }
}

// MARK: - Orders

struct CreateOrderRequest: Encodable {
    let locationId: String
    let customerId: String?
    let items: [CreateOrderItem]
    let discountAmount: Decimal?
    let taxAmount: Decimal
    let tipAmount: Decimal
    let subtotal: Decimal
    let total: Decimal
    let notes: String?
    let idempotencyKey: String
}

struct CreateOrderItem: Encodable {
    let productId: String?
    let variantId: String?
    let quantity: Int
    let unitPrice: Decimal
    let discountAmount: Decimal?
    let taxAmount: Decimal
    let total: Decimal
    let name: String
    let modifiers: [String]?
}

struct APIOrder: Decodable, Identifiable {
    let id: String
    let orderNumber: String
    let status: String
    let subtotal: Decimal
    let total: Decimal
    let taxAmount: Decimal
    let tipAmount: Decimal
    let discountAmount: Decimal?
    let createdAt: String
    let customer: APICustomer?
}

// MARK: - Payments

struct CreatePaymentRequest: Encodable {
    let orderId: String
    let amount: Int
    let currency: String
    let paymentMethod: String
    let idempotencyKey: String
}

struct APIPaymentIntent: Decodable {
    let id: String
    let clientSecret: String?
    let stripePaymentIntentId: String?
    let amount: Int
    let currency: String
    let status: String
}

struct CashPaymentRequest: Encodable {
    let orderId: String
    let amount: Int
    let currency: String
    let cashGiven: Int
    let idempotencyKey: String
}

// MARK: - Locations

struct APILocation: Decodable, Identifiable {
    let id: String
    let name: String
    let city: String?
    let state: String?
    let isDefault: Bool
    let stripeLocationId: String?
    let taxRate: Decimal?
}

// MARK: - API Response Wrapper

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T
    let message: String?
}

struct PaginatedResponse<T: Decodable>: Decodable {
    let items: [T]
    let total: Int
    let page: Int
    let limit: Int
}
