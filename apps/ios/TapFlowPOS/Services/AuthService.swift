import Foundation

final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var isAuthenticated = false
    @Published var currentUser: APIUser?
    @Published var currentMerchant: APIMerchantSummary?
    @Published var selectedLocation: APILocation?
    @Published var isLoading = false

    private(set) var accessToken: String?
    private var refreshTokenValue: String?

    private let tokenKey = "tapflow_access_token"
    private let refreshKey = "tapflow_refresh_token"
    private let merchantKey = "tapflow_merchant_id"

    private init() {}

    // MARK: - Load saved session

    func loadSavedSession() async {
        guard let token = KeychainHelper.read(key: tokenKey) else { return }
        accessToken = token

        do {
            let user = try await APIService.shared.getMe()
            await MainActor.run {
                self.currentUser = user
                self.isAuthenticated = true
            }
            await loadLocations()
        } catch {
            await MainActor.run {
                self.isAuthenticated = false
                self.accessToken = nil
            }
        }
    }

    // MARK: - Login

    func login(email: String, password: String, mfaCode: String? = nil) async throws {
        await MainActor.run { isLoading = true }
        defer { Task { await MainActor.run { self.isLoading = false } } }

        let response = try await APIService.shared.login(email: email, password: password, mfaCode: mfaCode)

        KeychainHelper.write(key: tokenKey, value: response.accessToken)
        accessToken = response.accessToken

        if let merchant = response.merchant {
            UserDefaults.standard.set(merchant.id, forKey: merchantKey)
        }

        await MainActor.run {
            self.currentUser = response.user
            self.currentMerchant = response.merchant
            self.isAuthenticated = true
        }

        await loadLocations()
    }

    // MARK: - Logout

    func logout() async {
        KeychainHelper.delete(key: tokenKey)
        KeychainHelper.delete(key: refreshKey)
        UserDefaults.standard.removeObject(forKey: merchantKey)
        accessToken = nil

        await MainActor.run {
            self.isAuthenticated = false
            self.currentUser = nil
            self.currentMerchant = nil
            self.selectedLocation = nil
            CartService.shared.clear()
        }

        try? await TerminalService.shared.disconnect()
    }

    // MARK: - Token refresh

    func refreshToken() async throws -> String {
        struct RefreshResponse: Decodable {
            let accessToken: String
        }
        let response: RefreshResponse = try await APIService.shared.post("/auth/refresh")
        accessToken = response.accessToken
        KeychainHelper.write(key: tokenKey, value: response.accessToken)
        return response.accessToken
    }

    // MARK: - Load locations

    private func loadLocations() async {
        do {
            let locations = try await APIService.shared.getLocations()
            let defaultLocation = locations.first(where: { $0.isDefault }) ?? locations.first
            await MainActor.run {
                self.selectedLocation = defaultLocation
                if let rate = defaultLocation?.taxRate {
                    CartService.shared.setTaxRate(rate)
                }
            }
        } catch {
            // Non-fatal
        }
    }
}

// MARK: - Keychain Helper

enum KeychainHelper {
    static func write(key: String, value: String) {
        let data = value.data(using: .utf8)!
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecValueData: data,
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func read(key: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else { return nil }
        return value
    }

    static func delete(key: String) {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
