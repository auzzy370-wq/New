# Android POS App - Implementation Guide

## Overview

The TapFlow POS Android app is built with Kotlin + Jetpack Compose and uses the official Stripe Terminal Android SDK for card-present payments including Tap to Pay (NFC).

---

## Requirements

| Requirement | Value |
|---|---|
| Min SDK | Android 9 (API 28) |
| Target SDK | Android 14 (API 34) |
| Language | Kotlin |
| UI Framework | Jetpack Compose |
| Stripe Terminal SDK | [stripe/stripe-terminal-android](https://github.com/stripe/stripe-terminal-android) |
| NFC | Required for Tap to Pay |

---

## Dependencies (build.gradle.kts)

```kotlin
dependencies {
    implementation("com.stripe:stripeterminal:3.+")
    implementation("com.stripe:stripeterminal-core:3.+")
    implementation("com.stripe:stripeterminal-localmobile:3.+") // Tap to Pay
    
    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.7")
    
    // HTTP
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // DataStore (offline cache)
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    implementation("androidx.room:room-runtime:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")
}
```

---

## AndroidManifest Permissions

```xml
<!-- Required for Tap to Pay (NFC) -->
<uses-feature android:name="android.hardware.nfc" android:required="false" />
<uses-permission android:name="android.permission.NFC" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Network -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Location (required by Stripe Terminal) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Bluetooth (for some readers) -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
```

---

## Project Structure

```
app/
├── src/main/kotlin/com/tapflow/pos/
│   ├── TapFlowApplication.kt
│   ├── ui/
│   │   ├── auth/
│   │   │   └── LoginScreen.kt
│   │   ├── pos/
│   │   │   ├── POSScreen.kt           ← Main POS screen
│   │   │   ├── ProductGrid.kt
│   │   │   ├── CartPanel.kt
│   │   │   └── CheckoutSheet.kt
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.kt
│   │   └── theme/
│   │       └── TapFlowTheme.kt
│   ├── terminal/
│   │   ├── TerminalManager.kt         ← Stripe Terminal singleton
│   │   ├── TapFlowTokenProvider.kt
│   │   └── PaymentProcessor.kt
│   ├── data/
│   │   ├── api/
│   │   │   ├── TapFlowApi.kt
│   │   │   └── models/
│   │   └── local/
│   │       └── AppDatabase.kt
│   └── viewmodel/
│       ├── POSViewModel.kt
│       └── TerminalViewModel.kt
```

---

## Connection Token Provider

```kotlin
import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider

class TapFlowTokenProvider(
    private val api: TapFlowApi,
    private val locationId: String?
) : ConnectionTokenProvider {

    override fun fetchConnectionToken(callback: ConnectionTokenCallback) {
        // MUST fetch from your backend - never generate client-side
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = api.getConnectionToken(locationId ?: "")
                callback.onSuccess(response.secret)
            } catch (e: Exception) {
                callback.onFailure(e)
            }
        }
    }
}
```

---

## TerminalManager

```kotlin
import com.stripe.stripeterminal.Terminal
import com.stripe.stripeterminal.external.callable.*
import com.stripe.stripeterminal.external.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

object TerminalManager : TerminalListener {
    
    private val _connectionStatus = MutableStateFlow(ConnectionStatus.NOT_CONNECTED)
    val connectionStatus: StateFlow<ConnectionStatus> = _connectionStatus
    
    private val _discoveredReaders = MutableStateFlow<List<Reader>>(emptyList())
    val discoveredReaders: StateFlow<List<Reader>> = _discoveredReaders
    
    var isInitialized = false
        private set
    
    fun initialize(context: Context, tokenProvider: TapFlowTokenProvider) {
        if (!Terminal.isInitialized()) {
            Terminal.initTerminal(context, LogLevel.VERBOSE, tokenProvider, this)
        }
        isInitialized = true
    }
    
    fun discoverLocalMobileReaders(callback: Callback) {
        val config = DiscoveryConfiguration.LocalMobileDiscoveryConfiguration(
            isSimulated = BuildConfig.DEBUG // Use simulated in debug
        )
        
        Terminal.getInstance().discoverReaders(config, object : DiscoveryListener {
            override fun onUpdateDiscoveredReaders(readers: List<Reader>) {
                _discoveredReaders.value = readers
            }
        }, callback)
    }
    
    fun connectLocalMobileReader(
        reader: Reader,
        locationId: String,
        callback: ReaderCallback
    ) {
        val params = ConnectionConfiguration.LocalMobileConnectionConfiguration(
            locationId = locationId,
            autoReconnectOnUnexpectedDisconnect = true,
            localMobileReaderListener = object : LocalMobileReaderListener {
                override fun onStartInstallingUpdate(update: ReaderSoftwareUpdate, cancelable: Cancelable?) {}
                override fun onReportReaderSoftwareUpdateProgress(progress: Float) {}
                override fun onFinishInstallingUpdate(update: ReaderSoftwareUpdate?, e: TerminalException?) {}
            }
        )
        
        Terminal.getInstance().connectLocalMobileReader(reader, params, callback)
    }
    
    override fun onConnectionStatusChange(status: ConnectionStatus) {
        _connectionStatus.value = status
    }
    
    override fun onUnexpectedReaderDisconnect(reader: Reader) {
        _connectionStatus.value = ConnectionStatus.NOT_CONNECTED
    }
    
    override fun onPaymentStatusChange(status: PaymentStatus) {}
}
```

---

## Payment Processing

```kotlin
class PaymentProcessor(
    private val api: TapFlowApi,
    private val scope: CoroutineScope
) {
    
    sealed class PaymentResult {
        data class Success(val paymentIntentId: String) : PaymentResult()
        data class Error(val message: String) : PaymentResult()
        object Cancelled : PaymentResult()
    }
    
    fun processPayment(
        orderId: String,
        amount: Long, // in cents
        onStatusUpdate: (String) -> Unit,
        onResult: (PaymentResult) -> Unit
    ) {
        scope.launch {
            try {
                // 1. Create PaymentIntent on our backend
                onStatusUpdate("Creating payment...")
                val idempotencyKey = "pi-$orderId-${UUID.randomUUID()}"
                val intentResponse = api.createPaymentIntent(
                    orderId = orderId,
                    paymentMethod = "TAP_TO_PAY",
                    idempotencyKey = idempotencyKey
                )
                
                val clientSecret = intentResponse.clientSecret
                val paymentIntentId = intentResponse.paymentIntentId
                
                // 2. Retrieve PaymentIntent via Terminal SDK
                onStatusUpdate("Preparing payment...")
                val paymentIntent = suspendCoroutine { continuation ->
                    Terminal.getInstance().retrievePaymentIntent(clientSecret) { intent, error ->
                        if (error != null) continuation.resumeWithException(error)
                        else continuation.resume(intent!!)
                    }
                }
                
                // 3. Collect payment method (shows Tap to Pay UI)
                onStatusUpdate("Tap card or phone to reader")
                val collectedIntent = suspendCoroutine { continuation ->
                    Terminal.getInstance().collectPaymentMethod(
                        paymentIntent,
                        CollectConfiguration.Builder().build()
                    ) { intent, error ->
                        if (error != null) continuation.resumeWithException(error)
                        else continuation.resume(intent!!)
                    }
                }
                
                // 4. Process payment
                onStatusUpdate("Processing...")
                val processedIntent = suspendCoroutine { continuation ->
                    Terminal.getInstance().processPayment(collectedIntent) { intent, error ->
                        if (error != null) continuation.resumeWithException(error)
                        else continuation.resume(intent!!)
                    }
                }
                
                // 5. Confirm with our backend
                onStatusUpdate("Confirming...")
                api.confirmPayment(paymentIntentId)
                
                onStatusUpdate("Payment successful!")
                onResult(PaymentResult.Success(paymentIntentId))
                
            } catch (e: TerminalException) {
                if (e.errorCode == TerminalException.TerminalErrorCode.CANCELED) {
                    onResult(PaymentResult.Cancelled)
                } else {
                    onResult(PaymentResult.Error(e.errorMessage ?: "Payment failed"))
                }
            } catch (e: Exception) {
                onResult(PaymentResult.Error(e.message ?: "Payment failed"))
            }
        }
    }
}
```

---

## NFC Compatibility Check

```kotlin
fun checkNfcCompatibility(context: Context): NfcStatus {
    val nfcManager = context.getSystemService(Context.NFC_SERVICE) as? NfcManager
    val adapter = nfcManager?.defaultAdapter
    
    return when {
        adapter == null -> NfcStatus.NOT_SUPPORTED
        !adapter.isEnabled -> NfcStatus.DISABLED
        else -> NfcStatus.READY
    }
}

enum class NfcStatus { READY, DISABLED, NOT_SUPPORTED }

// In POSScreen.kt
when (nfcStatus) {
    NfcStatus.NOT_SUPPORTED -> {
        // Show: "This device doesn't support Tap to Pay"
        // Offer card reader alternative
    }
    NfcStatus.DISABLED -> {
        // Show: "Please enable NFC in Settings to use Tap to Pay"
        // Deep link to NFC settings
    }
    NfcStatus.READY -> {
        // Show Tap to Pay button
    }
}
```

---

## Offline Mode

```kotlin
// Check connectivity before payment
fun isOnline(context: Context): Boolean {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val network = cm.activeNetwork ?: return false
    val capabilities = cm.getNetworkCapabilities(network) ?: return false
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}

// In checkout:
if (!isOnline(context) && paymentMethod != PaymentMethod.CASH) {
    showMessage("Card payments require an internet connection.")
    return
}
```

---

## Google Play Store Requirements

1. **Data Safety Section**: Accurately declare all data collected (payment tokens, location)
2. **Financial Services**: Review Google Play's Financial Services policy
3. **Permissions Rationale**: Clearly explain NFC and Location permission usage
4. **Privacy Policy URL**: Required in store listing
5. **App Category**: Business or Finance
