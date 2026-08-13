import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noToken
    case httpError(Int, String)
    case decodingError(Error)
    case networkError(Error)
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .noToken: return "Not authenticated"
        case .httpError(let code, let message): return "[\(code)] \(message)"
        case .decodingError(let e): return "Data error: \(e.localizedDescription)"
        case .networkError(let e): return e.localizedDescription
        case .unknown: return "An unknown error occurred"
        }
    }
}

actor APIService {
    static let shared = APIService()

    private var baseURL: String {
        UserDefaults.standard.string(forKey: "tapflow_api_url") ?? "https://api.tapflow.app/api/v1"
    }

    private var merchantId: String? {
        UserDefaults.standard.string(forKey: "tapflow_merchant_id")
    }

    private init() {}

    // MARK: - Core request

    func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: (some Encodable)? = nil as String?,
        requiresAuth: Bool = true
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 30

        if requiresAuth {
            guard let token = AuthService.shared.accessToken else {
                throw APIError.noToken
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let mid = merchantId {
            request.setValue(mid, forHTTPHeaderField: "X-Merchant-ID")
        }

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 401 {
                    // Try to refresh token
                    if let newToken = try? await AuthService.shared.refreshToken() {
                        request.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
                        let (retryData, _) = try await URLSession.shared.data(for: request)
                        return try decodeResponse(retryData)
                    }
                    throw APIError.httpError(401, "Unauthorized")
                }

                guard (200...299).contains(httpResponse.statusCode) else {
                    let message = extractErrorMessage(from: data) ?? "Request failed"
                    throw APIError.httpError(httpResponse.statusCode, message)
                }
            }

            return try decodeResponse(data)
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    private func decodeResponse<T: Decodable>(_ data: Data) throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        do {
            // Try wrapped response first
            if let wrapped = try? decoder.decode(APIResponse<T>.self, from: data) {
                return wrapped.data
            }
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    private func extractErrorMessage(from data: Data) -> String? {
        struct ErrorBody: Decodable {
            let message: String?
        }
        return (try? JSONDecoder().decode(ErrorBody.self, from: data))?.message
    }

    // MARK: - Convenience methods

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "GET")
    }

    func post<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await request(path, method: "POST", body: body)
    }

    func post<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "POST", body: nil as String?)
    }

    func put<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await request(path, method: "PUT", body: body)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "DELETE")
    }

    // MARK: - Auth endpoints

    func login(email: String, password: String, mfaCode: String? = nil) async throws -> LoginResponse {
        let body = LoginRequest(email: email, password: password, mfaCode: mfaCode)
        return try await request("/auth/login", method: "POST", body: body, requiresAuth: false)
    }

    func getMe() async throws -> APIUser {
        try await get("/auth/me")
    }

    // MARK: - Products

    func getProducts(search: String? = nil, categoryId: String? = nil, page: Int = 1) async throws -> PaginatedResponse<APIProduct> {
        var path = "/products?page=\(page)&limit=50&isActive=true"
        if let s = search, !s.isEmpty { path += "&search=\(s.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? s)" }
        if let cid = categoryId { path += "&categoryId=\(cid)" }
        return try await get(path)
    }

    func getCategories() async throws -> [APICategory] {
        try await get("/products/categories")
    }

    // MARK: - Customers

    func getCustomers(search: String? = nil) async throws -> PaginatedResponse<APICustomer> {
        var path = "/customers?limit=50"
        if let s = search, !s.isEmpty { path += "&search=\(s.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? s)" }
        return try await get(path)
    }

    // MARK: - Orders

    func createOrder(_ request: CreateOrderRequest) async throws -> APIOrder {
        try await post("/orders", body: request)
    }

    func getOrders(page: Int = 1) async throws -> PaginatedResponse<APIOrder> {
        try await get("/orders?page=\(page)&limit=20")
    }

    func getOrder(_ id: String) async throws -> APIOrder {
        try await get("/orders/\(id)")
    }

    // MARK: - Payments

    func createPaymentIntent(_ request: CreatePaymentRequest) async throws -> APIPaymentIntent {
        try await post("/payments/create", body: request)
    }

    func processCashPayment(_ request: CashPaymentRequest) async throws -> APIOrder {
        try await post("/payments/cash", body: request)
    }

    func confirmPaymentIntent(paymentIntentId: String, stripePaymentIntentId: String) async throws -> APIOrder {
        struct ConfirmRequest: Encodable {
            let paymentIntentId: String
            let stripePaymentIntentId: String
        }
        return try await post("/payments/confirm", body: ConfirmRequest(
            paymentIntentId: paymentIntentId,
            stripePaymentIntentId: stripePaymentIntentId
        ))
    }

    // MARK: - Locations

    func getLocations() async throws -> [APILocation] {
        try await get("/locations")
    }

    // MARK: - Terminal

    func getConnectionToken(locationId: String) async throws -> String {
        struct TokenResponse: Decodable {
            let secret: String
        }
        let response: TokenResponse = try await post("/locations/\(locationId)/connection-token")
        return response.secret
    }
}
