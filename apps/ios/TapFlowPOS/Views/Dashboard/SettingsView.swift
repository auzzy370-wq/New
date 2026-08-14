import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authService: AuthService
    @ObservedObject private var terminalService = TerminalService.shared
    @State private var showServerConfig = false
    @State private var showSignOutConfirm = false
    @State private var isConnectingTerminal = false

    var body: some View {
        NavigationStack {
            List {
                // Account
                Section("Account") {
                    if let user = authService.currentUser {
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color.blue.opacity(0.15))
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Text(String(user.firstName.prefix(1)))
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(.blue)
                                )
                            VStack(alignment: .leading, spacing: 2) {
                                Text(user.displayName)
                                    .font(.system(size: 15, weight: .semibold))
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    if let merchant = authService.currentMerchant {
                        LabeledContent("Business", value: merchant.name)
                        LabeledContent("Payments", value: merchant.stripeChargesEnabled == true ? "Active" : "Setup required")
                    }
                }

                // Location
                Section("Location") {
                    if let location = authService.selectedLocation {
                        HStack {
                            Image(systemName: "mappin.circle.fill")
                                .foregroundColor(.red)
                            Text(location.name)
                            Spacer()
                            if location.isDefault {
                                Text("Default")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    } else {
                        Text("No location selected")
                            .foregroundColor(.secondary)
                    }
                }

                // Terminal / Tap to Pay
                Section("Tap to Pay") {
                    HStack {
                        Image(systemName: "iphone.radiowaves.left.and.right")
                            .foregroundColor(.blue)
                        Text("Device Support")
                        Spacer()
                        Text(terminalService.isTapToPaySupported ? "Supported" : "Not supported")
                            .font(.caption)
                            .foregroundColor(terminalService.isTapToPaySupported ? .green : .secondary)
                    }

                    HStack {
                        Image(systemName: connectionIcon)
                            .foregroundColor(connectionColor)
                        Text("Terminal")
                        Spacer()
                        Text(connectionLabel)
                            .font(.caption)
                            .foregroundColor(connectionColor)
                    }

                    if terminalService.isTapToPaySupported,
                       case .disconnected = terminalService.connectionState,
                       let locationId = authService.selectedLocation?.id {
                        Button(action: { connectTerminal(locationId: locationId) }) {
                            HStack {
                                if isConnectingTerminal {
                                    ProgressView().scaleEffect(0.8)
                                } else {
                                    Image(systemName: "bolt.circle")
                                }
                                Text("Connect Terminal")
                            }
                        }
                        .disabled(isConnectingTerminal)
                    }

                    Toggle(isOn: Binding(
                        get: { UserDefaults.standard.bool(forKey: "tapflow_use_simulated_reader") },
                        set: {
                            UserDefaults.standard.set($0, forKey: "tapflow_use_simulated_reader")
                            // Disconnect so next payment reconnects with correct mode
                            Task { try? await TerminalService.shared.disconnect() }
                        }
                    )) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Simulated Reader (Testing)")
                                .font(.system(size: 15))
                            Text("Enable to test payments without Stripe account setup")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    if !UserDefaults.standard.bool(forKey: "tapflow_use_simulated_reader"),
                       authService.currentMerchant?.stripeChargesEnabled != true {
                        Label {
                            Text("Turn on Simulated Reader above to test payments, or complete Stripe Connect setup in the merchant dashboard.")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        } icon: {
                            Image(systemName: "info.circle")
                                .foregroundColor(.orange)
                        }
                    }
                }

                // Configuration
                Section("Configuration") {
                    Button(action: { showServerConfig = true }) {
                        HStack {
                            Image(systemName: "server.rack")
                            Text("Server URL")
                            Spacer()
                            Text(serverDisplayURL)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .foregroundColor(.primary)
                }

                // About
                Section("About") {
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                    LabeledContent("Build", value: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                    Link("Privacy Policy", destination: URL(string: "https://tapflow.app/privacy")!)
                    Link("Terms of Service", destination: URL(string: "https://tapflow.app/terms")!)
                }

                // Sign out
                Section {
                    Button(role: .destructive, action: { showSignOutConfirm = true }) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign Out")
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showServerConfig) {
                ServerURLSheet(serverURL: Binding(
                    get: { UserDefaults.standard.string(forKey: "tapflow_api_url") ?? "" },
                    set: { UserDefaults.standard.set($0, forKey: "tapflow_api_url") }
                ))
            }
            .confirmationDialog("Sign out of TapFlow?", isPresented: $showSignOutConfirm, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) {
                    Task { await authService.logout() }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private var connectionLabel: String {
        switch terminalService.connectionState {
        case .disconnected: return "Disconnected"
        case .connecting: return "Connecting..."
        case .connected(let serial): return "Connected – \(serial)"
        case .error(let msg): return "Error: \(msg)"
        }
    }

    private var connectionColor: Color {
        switch terminalService.connectionState {
        case .connected: return .green
        case .connecting: return .orange
        case .error: return .red
        case .disconnected: return .secondary
        }
    }

    private var connectionIcon: String {
        switch terminalService.connectionState {
        case .connected: return "checkmark.circle.fill"
        case .connecting: return "arrow.triangle.2.circlepath"
        case .error: return "exclamationmark.circle.fill"
        case .disconnected: return "circle.slash"
        }
    }

    private var serverDisplayURL: String {
        let url = UserDefaults.standard.string(forKey: "tapflow_api_url") ?? ""
        return url.isEmpty ? "Not set" : url.replacingOccurrences(of: "https://", with: "")
    }

    private func connectTerminal(locationId: String) {
        isConnectingTerminal = true
        Task {
            do {
                try await terminalService.connectTapToPay(locationId: locationId)
            } catch {}
            isConnectingTerminal = false
        }
    }
}
