import SwiftUI

struct CustomerPickerView: View {
    let onSelect: (APICustomer?) -> Void

    @State private var search = ""
    @State private var customers: [APICustomer] = []
    @State private var isLoading = false
    @State private var searchTask: Task<Void, Never>?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                // No customer option
                Button(action: {
                    onSelect(nil)
                    dismiss()
                }) {
                    HStack {
                        Image(systemName: "person.slash")
                            .foregroundColor(.secondary)
                        Text("No Customer")
                            .foregroundColor(.secondary)
                    }
                }

                if isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }

                ForEach(customers) { customer in
                    Button(action: {
                        onSelect(customer)
                        dismiss()
                    }) {
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color.blue.opacity(0.15))
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Text(String(customer.firstName.prefix(1)))
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.blue)
                                )
                            VStack(alignment: .leading, spacing: 2) {
                                Text(customer.displayName)
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.primary)
                                if let email = customer.email {
                                    Text(email)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                            if let spent = customer.totalSpent {
                                Text(spent.currencyFormatted)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .searchable(text: $search, prompt: "Search customers...")
            .onChange(of: search) { _, _ in searchCustomers() }
            .navigationTitle("Select Customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await loadCustomers() }
        }
    }

    private func loadCustomers() async {
        isLoading = true
        do {
            let response = try await APIService.shared.getCustomers()
            customers = response.items
        } catch {}
        isLoading = false
    }

    private func searchCustomers() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            isLoading = true
            do {
                let response = try await APIService.shared.getCustomers(search: search.isEmpty ? nil : search)
                await MainActor.run { customers = response.items }
            } catch {}
            await MainActor.run { isLoading = false }
        }
    }
}
