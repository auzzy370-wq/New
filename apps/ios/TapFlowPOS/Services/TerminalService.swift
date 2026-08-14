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
    private var collectCancelable: Cancelable?
    private var easyConnectCancelable: Cancelable?
    private var locationId: String?

    private override init() {
        super.init()
    }

    // Called after Terminal.initWithTokenProvider to check support.
    // Hardware compatibility is validated by the SDK when connectTapToPay is called;
    // we gate the UI on iOS 16+ (minimum OS for Tap to Pay on iPhone).
    func checkDeviceSupport() {
        if #available(iOS 16.0, *) {
            isTapToPaySupported = true
        } else {
            isTapToPaySupported = false
        }
    }

    // MARK: - Connect (Tap to Pay on iPhone)

    func connectTapToPay(locationId: String) async throws {
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

            let reader: Reader = try await withCheckedThrowingContinuation { continuation in
                let cancelable = Terminal.shared.easyConnect(easyConfig) { reader, error in
                    if let reader = reader {
                        continuation.resume(returning: reader)
                    } else {
                        continuation.resume(throwing: error ?? NSError(
                            domain: "TerminalService", code: 1,
                            userInfo: [NSLocalizedDescriptionKey: "easyConnect failed"]))
                    }
                }
                self.easyConnectCancelable = cancelable
            }
            easyConnectCancelable = nil
            connectionState = .connected(reader.serialNumber)
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
            // Retrieve the PaymentIntent
            let intent: PaymentIntent = try await withCheckedThrowingContinuation { continuation in
                Terminal.shared.retrievePaymentIntent(
                    clientSecret: paymentIntentClientSecret
                ) { intent, error in
                    if let intent = intent {
                        continuation.resume(returning: intent)
                    } else {
                        continuation.resume(throwing: error ?? NSError(
                            domain: "TerminalService", code: 2,
                            userInfo: [NSLocalizedDescriptionKey: "retrievePaymentIntent failed"]))
                    }
                }
            }
            currentPaymentIntent = intent

            // Collect payment method via callback
            let collectConfig = try CollectPaymentIntentConfigurationBuilder().build()
            let collectedIntent: PaymentIntent = try await withCheckedThrowingContinuation { continuation in
                let cancelable = Terminal.shared.collectPaymentMethod(
                    intent,
                    collectConfig: collectConfig
                ) { [weak self] collectedIntent, error in
                    self?.collectCancelable = nil
                    if let collectedIntent = collectedIntent {
                        continuation.resume(returning: collectedIntent)
                    } else {
                        continuation.resume(throwing: error ?? NSError(
                            domain: "TerminalService", code: 3,
                            userInfo: [NSLocalizedDescriptionKey: "collectPaymentMethod failed"]))
                    }
                }
                self.collectCancelable = cancelable
            }

            // Confirm payment via callback
            paymentState = .processing
            let confirmConfig = try ConfirmPaymentIntentConfigurationBuilder().build()
            let confirmedIntent: PaymentIntent = try await withCheckedThrowingContinuation { continuation in
                Terminal.shared.confirmPaymentIntent(
                    collectedIntent,
                    confirmConfig: confirmConfig
                ) { confirmedIntent, error in
                    if let confirmedIntent = confirmedIntent {
                        continuation.resume(returning: confirmedIntent)
                    } else {
                        continuation.resume(throwing: error ?? NSError(
                            domain: "TerminalService", code: 4,
                            userInfo: [NSLocalizedDescriptionKey: "confirmPaymentIntent failed"]))
                    }
                }
            }

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
        // Cancelable.cancel() is async throws in SDK 5.x — fire-and-forget via Task
        if let cancelable = collectCancelable {
            collectCancelable = nil
            Task { try? await cancelable.cancel() }
        }
        if let cancelable = easyConnectCancelable {
            easyConnectCancelable = nil
            Task { try? await cancelable.cancel() }
        }
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
