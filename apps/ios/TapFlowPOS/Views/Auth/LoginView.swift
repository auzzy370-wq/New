import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authService: AuthService

    @State private var email = ""
    @State private var password = ""
    @State private var mfaCode = ""
    @State private var requiresMFA = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showServerURL = false
    @State private var serverURL = UserDefaults.standard.string(forKey: "tapflow_api_url") ?? "https://new-production-97c4.up.railway.app/api/v1"

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [Color(.systemBlue).opacity(0.08), Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 32) {
                        // Logo
                        VStack(spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(Color.blue)
                                    .frame(width: 72, height: 72)
                                    .shadow(color: .blue.opacity(0.4), radius: 12, y: 6)
                                Image(systemName: "bolt.fill")
                                    .font(.system(size: 36, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            Text("TapFlow POS")
                                .font(.system(size: 28, weight: .bold, design: .rounded))
                            Text("Sign in to your account")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 40)

                        // Form
                        VStack(spacing: 0) {
                            FormCard {
                                FormField(
                                    icon: "envelope",
                                    placeholder: "Email address",
                                    text: $email,
                                    keyboardType: .emailAddress
                                )
                                Divider().padding(.leading, 44)

                                FormField(
                                    icon: "lock",
                                    placeholder: "Password",
                                    text: $password,
                                    isSecure: true
                                )

                                if requiresMFA {
                                    Divider().padding(.leading, 44)
                                    FormField(
                                        icon: "number.square",
                                        placeholder: "MFA Code",
                                        text: $mfaCode,
                                        keyboardType: .numberPad
                                    )
                                }
                            }
                        }

                        // Error
                        if let error = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.red.opacity(0.08))
                            .cornerRadius(10)
                        }

                        // Sign in button
                        Button(action: handleSignIn) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(.white)
                                } else {
                                    Text(requiresMFA ? "Verify Code" : "Sign In")
                                        .font(.system(size: 17, weight: .semibold))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(isFormValid ? Color.blue : Color.blue.opacity(0.4))
                            .foregroundColor(.white)
                            .cornerRadius(14)
                        }
                        .disabled(!isFormValid || isLoading)

                        // Server config
                        Button(action: { showServerURL.toggle() }) {
                            HStack(spacing: 4) {
                                Image(systemName: "server.rack")
                                    .font(.caption)
                                Text("Configure Server")
                                    .font(.caption)
                            }
                            .foregroundColor(.secondary)
                        }

                        Spacer()
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 32)
                }
            }
            .sheet(isPresented: $showServerURL) {
                ServerURLSheet(serverURL: $serverURL)
            }
            .navigationBarHidden(true)
        }
    }

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty
    }

    private func handleSignIn() {
        guard isFormValid else { return }

        // Save server URL
        UserDefaults.standard.set(serverURL, forKey: "tapflow_api_url")

        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authService.login(
                    email: email,
                    password: password,
                    mfaCode: requiresMFA && !mfaCode.isEmpty ? mfaCode : nil
                )
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}

// MARK: - Form Components

struct FormCard<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    var body: some View {
        VStack(spacing: 0) {
            content
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.06), radius: 16, y: 4)
    }
}

struct FormField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.secondary)
                .frame(width: 20)
                .padding(.leading, 16)

            if isSecure {
                SecureField(placeholder, text: $text)
                    .font(.system(size: 16))
                    .padding(.vertical, 16)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            } else {
                TextField(placeholder, text: $text)
                    .font(.system(size: 16))
                    .keyboardType(keyboardType)
                    .padding(.vertical, 16)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            }
        }
        .padding(.trailing, 16)
    }
}

struct ServerURLSheet: View {
    @Binding var serverURL: String
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Backend API URL"), footer: Text("Enter the base URL of your TapFlow backend API, e.g. https://api.yourdomain.com/api/v1")) {
                    TextField("https://new-production-97c4.up.railway.app/api/v1", text: $serverURL)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
            }
            .navigationTitle("Server Configuration")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        UserDefaults.standard.set(serverURL, forKey: "tapflow_api_url")
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}
