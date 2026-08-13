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
    private var locationId: String?

    private override init() {
        super.init()
        isTapToPaySupported = LocalMobileReader.deviceIsSupported
    }

    // MARK: - Connection Token Provider

    func fetchConnectionToken() async throws -> String {
        guard let locationId = locationId,
              let _ = AuthService.shared.selectedLocation else {
            throw NSError(domain: "TerminalService", code: 0,
                          userInfo: [NSLocalizedDescriptionKey: "No location selected"])
        }
        return try await APIService.shared.getConnectionToken(locationId: locationId)
    }

    // MARK: - Connect (Tap to Pay on iPhone)

    func connectTapToPay(locationId: String) async throws {
        guard LocalMobileReader.deviceIsSupported else {
            throw NSError(domain: "TerminalService", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "This device does not support Tap to Pay on iPhone. Requires iPhone XS or later with iOS 16.4+."])
        }

        self.locationId = locationId
        isConnecting = true
        connectionState = .connecting

        defer { isConnecting = false }

        let config = LocalMobileConnectionConfiguration(locationId: locationId)

        do {
            let reader = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Reader, Error>) in
                let discovery = LocalMobileDiscoveryConfiguration(simulated: self.isSimulated())
                var cancelable: Cancelable?
                cancelable = Terminal.shared.discoverReaders(discovery, delegate: self) { error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    }
                    _ = cancelable
                }

                Terminal.shared.connectLocalMobileReader(
                    LocalMobileReader(),
                    delegate: self,
                    connectionConfig: config
                ) { reader, error in
                    if let reader = reader {
                        continuation.resume(returning: reader)
                    } else if let error = error {
                        continuation.resume(throwing: error)
                    }
                }
            }

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

            // Collect payment method
            paymentState = .collectingPayment
            let collectedIntent = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<PaymentIntent, Error>) in
                collectCancelable = Terminal.shared.collectPaymentMethod(intent) { intent, error in
                    if let intent = intent {
                        continuation.resume(returning: intent)
                    } else if let error = error as? NSError, error.domain == "com.stripe-terminal-ios.StripeTerminal" && error.code == 2020 {
                        continuation.resume(throwing: NSError(domain: "TerminalService", code: 2020, userInfo: [NSLocalizedDescriptionKey: "Payment collection cancelled"]))
                    } else {
                        continuation.resume(throwing: error ?? NSError(domain: "Terminal", code: 0, userInfo: nil))
                    }
                }
            }

            // Process payment
            paymentState = .processing
            let processedIntent = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<PaymentIntent, Error>) in
                Terminal.shared.processPayment(collectedIntent) { intent, error in
                    if let intent = intent, intent.status == .requiresCapture || intent.status == .succeeded {
                        continuation.resume(returning: intent)
                    } else if let intent = intent {
                        continuation.resume(returning: intent)
                    } else {
                        continuation.resume(throwing: error ?? NSError(domain: "Terminal", code: 0, userInfo: nil))
                    }
                }
            }

            currentPaymentIntent = nil
            return processedIntent.stripeId ?? stripePaymentIntentId
        } catch {
            paymentState = .failed(error.localizedDescription)
            throw error
        }
    }

    // MARK: - Cancel

    func cancelCollection() {
        collectCancelable?.cancel { _ in }
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

// MARK: - DiscoveryDelegate

extension TerminalService: DiscoveryDelegate {
    nonisolated func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {}
}

// MARK: - LocalMobileReaderDelegate

extension TerminalService: LocalMobileReaderDelegate {
    nonisolated func localMobileReader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {}
    nonisolated func localMobileReader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {}
    nonisolated func localMobileReader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {}
    nonisolated func localMobileReader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions) {}
    nonisolated func localMobileReader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {}
    nonisolated func localMobileReader(_ reader: Reader, didReportAvailableUpdate update: ReaderSoftwareUpdate) {}
    nonisolated func localMobileReaderDidAcceptTermsOfService(_ reader: Reader) {}
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
                let token = try await self.fetchConnectionToken()
                completion(token, nil)
            } catch {
                completion(nil, error)
            }
        }
    }
}
