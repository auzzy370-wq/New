import Foundation
import StripeTerminal

// MARK: - Terminal Connection State

enum TerminalConnectionState: Equatable {
    case disconnected
    case connecting
    case connected(String) // reader serial
    case error(String)
}

// MARK: - Payment State

enum PaymentState: Equatable {
    case idle
    case creatingIntent
    case collectingPayment
    case processing
    case succeeded(String) // order ID
    case failed(String)
    case cancelled
}

// MARK: - Terminal Service

@MainActor
final class TerminalService: NSObject, ObservableObject {
    static let shared = TerminalService()

    @Published var connectionState: TerminalConnectionState = .disconnected
    @Published var paymentState: PaymentState = .idle
    @Published var isConnecting = false
    @Published var isTapToPaySupported = false

    private var currentPaymentIntent: PaymentIntent?
    private var collectTask: Task<PaymentIntent, Error>?
    private var locationId: String?

    private override init() {
        super.init()
    }

    // Called after Terminal.initWithTokenProvider to check support
    func checkDeviceSupport() {
        let result = Terminal.shared.supportsReaders(
            of: .tapToPay,
            discoveryMethod: .tapToPay,
            simulated: false
        )
        if case .success = result {
            isTapToPaySupported = true
        }
    }

    // MARK: - Connect (Tap to Pay on iPhone)

    func connectTapToPay(locationId: String) async throws {
        let result = Terminal.shared.supportsReaders(
            of: .tapToPay,
            discoveryMethod: .tapToPay,
            simulated: isSimulated()
        )
        guard case .success = result else {
            throw NSError(domain: "TerminalService", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "This device does not support Tap to Pay on iPhone. Requires iPhone XS or later with iOS 16.4+."])
        }

        self.locationId = locationId
        isConnecting = true
        connectionState = .connecting
        defer { isConnecting = false }

        do {
            let simulated = isSimulated()
            let discoveryConfig = try TapToPayDiscoveryConfigurationBuilder()
                .setSimulated(simulated)
                .build()
            let connectionConfig = try TapToPayConnectionConfigurationBuilder(
                delegate: self,
                locationId: locationId
            ).build()
            let easyConfig = TapToPayEasyConnectConfiguration(
                discoveryConfiguration: discoveryConfig,
                connectionConfiguration: connectionConfig
            )
            let reader = try await Terminal.shared.easyConnect(easyConfig)
            connectionState = .connected(reader.serialNumber ?? "Tap to Pay")
        } catch {
            connectionState = .error(error.localizedDescription)
            throw error
        }
    }

    // MARK: - Disconnect

    func disconnect() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Terminal.shared.disconnectReader { error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
        connectionState = .disconnected
    }

    // MARK: - Collect Payment (Tap to Pay)

    func collectPayment(
        paymentIntentClientSecret: String,
        stripePaymentIntentId: String
    ) async throws -> String {
        paymentState = .collectingPayment

        do {
            // Retrieve the payment intent
            let intent = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<PaymentIntent, Error>) in
                Terminal.shared.retrievePaymentIntent(clientSecret: paymentIntentClientSecret) { intent, error in
                    if let intent = intent {
                        continuation.resume(returning: intent)
                    } else {
                        continuation.resume(throwing: error ?? NSError(domain: "Terminal", code: 0, userInfo: nil))
                    }
                }
            }
            currentPaymentIntent = intent

            // Collect payment method (async)
            let collectConfig = try CollectPaymentIntentConfigurationBuilder().build()
            let collectTask = Task<PaymentIntent, Error> {
                try await Terminal.shared.collectPaymentMethod(intent, collectConfig: collectConfig)
            }
            self.collectTask = collectTask
            let collectedIntent = try await collectTask.value

            // Confirm payment
            paymentState = .processing
            let confirmConfig = try ConfirmPaymentIntentConfigurationBuilder().build()
            let confirmedIntent = try await Terminal.shared.confirmPaymentIntent(
                collectedIntent,
                confirmConfig: confirmConfig
            )

            currentPaymentIntent = nil
            paymentState = .succeeded(stripePaymentIntentId)
            return confirmedIntent.stripeId ?? stripePaymentIntentId
        } catch {
            paymentState = .failed(error.localizedDescription)
            throw error
        }
    }

    // MARK: - Cancel

    func cancelCollection() {
        collectTask?.cancel()
        collectTask = nil
        paymentState = .cancelled
    }

    // MARK: - Helpers

    private func isSimulated() -> Bool {
#if targetEnvironment(simulator)
        return true
#else
        return UserDefaults.standard.bool(forKey: "tapflow_use_simulated_reader")
#endif
    }
}

// MARK: - TapToPayReaderDelegate

extension TerminalService: TapToPayReaderDelegate {
    nonisolated func tapToPayReader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {}
    nonisolated func tapToPayReader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {}
    nonisolated func tapToPayReader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {}
    nonisolated func tapToPayReaderDidAcceptTermsOfService(_ reader: Reader) {}
    nonisolated func tapToPayReader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions = []) {}
    nonisolated func tapToPayReader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {}
}

// MARK: - TerminalDelegate

extension TerminalService: TerminalDelegate {
    nonisolated func terminal(_ terminal: Terminal, didReportUnexpectedReaderDisconnect reader: Reader) {
        Task { @MainActor in
            self.connectionState = .disconnected
        }
    }
}

// MARK: - ConnectionTokenProvider

extension TerminalService: ConnectionTokenProvider {
    nonisolated func fetchConnectionToken(_ completion: @escaping ConnectionTokenCompletionBlock) {
        Task {
            do {
                let locId = await self.locationId ?? ""
                let token = try await APIService.shared.getConnectionToken(locationId: locId)
                completion(token, nil)
            } catch {
                completion(nil, error)
            }
        }
    }
}
