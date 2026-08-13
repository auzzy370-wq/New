import SwiftUI
import Kingfisher

struct ProductsListView: View {
    @State private var products: [APIProduct] = []
    @State private var isLoading = false
    @State private var search = ""
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && products.isEmpty {
                    ProgressView("Loading products...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if products.isEmpty {
                    ContentUnavailableView(
                        search.isEmpty ? "No Products" : "No Results",
                        systemImage: "square.grid.2x2",
                        description: Text(search.isEmpty ? "Add products in the web dashboard" : "Try a different search")
                    )
                } else {
                    List(products) { product in
                        ProductListRow(product: product)
                    }
                    .refreshable { await loadProducts() }
                }
            }
            .searchable(text: $search, prompt: "Search products...")
            .onChange(of: search) { _, _ in searchDebounced() }
            .navigationTitle("Products")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadProducts() }
        }
    }

    private func loadProducts() async {
        isLoading = true
        do {
            let response = try await APIService.shared.getProducts(search: search.isEmpty ? nil : search)
            products = response.items
        } catch {}
        isLoading = false
    }

    private func searchDebounced() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 400_000_000)
            guard !Task.isCancelled else { return }
            await loadProducts()
        }
    }
}

struct ProductListRow: View {
    let product: APIProduct

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                if let url = product.imageUrl.flatMap(URL.init) {
                    KFImage(url)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Color.blue.opacity(0.1)
                    Text(String(product.name.prefix(2)).uppercased())
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.blue)
                }
            }
            .frame(width: 44, height: 44)
            .cornerRadius(8)

            VStack(alignment: .leading, spacing: 3) {
                Text(product.name)
                    .font(.system(size: 15, weight: .medium))
                if let sku = product.sku {
                    Text("SKU: \(sku)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                Text(product.price.currencyFormatted)
                    .font(.system(size: 15, weight: .semibold))
                if !product.isActive {
                    Text("Inactive")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
