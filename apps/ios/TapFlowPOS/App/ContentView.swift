import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authService: AuthService

    var body: some View {
        Group {
            if authService.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .onAppear {
            Task { await authService.loadSavedSession() }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var authService: AuthService
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            POSView()
                .tabItem {
                    Label("POS", systemImage: "cart.fill")
                }
                .tag(0)

            OrdersListView()
                .tabItem {
                    Label("Orders", systemImage: "list.bullet.rectangle")
                }
                .tag(1)

            ProductsListView()
                .tabItem {
                    Label("Products", systemImage: "square.grid.2x2")
                }
                .tag(2)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(3)
        }
        .accentColor(.blue)
    }
}
