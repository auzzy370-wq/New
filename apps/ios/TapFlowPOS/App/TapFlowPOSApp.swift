import SwiftUI
import StripeTerminal

@main
struct TapFlowPOSApp: App {
    @StateObject private var authService = AuthService.shared
    @StateObject private var cartService = CartService.shared
    @StateObject private var terminalService = TerminalService.shared

    init() {
        Terminal.setTokenProvider(TerminalService.shared)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .environmentObject(cartService)
                .environmentObject(terminalService)
        }
    }
}
