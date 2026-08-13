import SwiftUI

struct POSView: View {
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var cartService: CartService

    @StateObject private var viewModel = POSViewModel()
    @State private var showCheckout = false
    @State private var searchText = ""
    @State private var selectedCategory: APICategory?
    @State private var showCustomerPicker = false

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                let isLandscape = geometry.size.width > geometry.size.height

                if isLandscape {
                    // Landscape: side by side
                    HStack(spacing: 0) {
                        productSection
                            .frame(width: geometry.size.width * 0.58)

                        Divider()

                        cartSection
                            .frame(width: geometry.size.width * 0.42)
                    }
                } else {
                    // Portrait: stacked with cart as bottom sheet
                    ZStack(alignment: .bottom) {
                        VStack(spacing: 0) {
                            productSection
                        }

                        if !cartService.isEmpty {
                            CartDrawerView(showCheckout: $showCheckout)
                                .transition(.move(edge: .bottom))
                        }
                    }
                }
            }
            .navigationTitle("POS")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
            .sheet(isPresented: $showCheckout) {
                CheckoutView()
                    .environmentObject(cartService)
                    .environmentObject(authService)
            }
            .sheet(isPresented: $showCustomerPicker) {
                CustomerPickerView(onSelect: { customer in
                    cartService.setCustomer(customer)
                    showCustomerPicker = false
                })
            }
            .task { await viewModel.loadInitial() }
            .refreshable { await viewModel.loadInitial() }
        }
    }

    // MARK: - Product Section

    private var productSection: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack(spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                        .font(.system(size: 15))
                    TextField("Search products...", text: $searchText)
                        .font(.system(size: 15))
                        .autocorrectionDisabled()
                        .onChange(of: searchText, perform: { value in
                            viewModel.searchDebounced(value)
                        })
                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(Color(.systemFill))
                .cornerRadius(12)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.systemBackground))

            // Category tabs
            if !viewModel.categories.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        CategoryPill(label: "All", isSelected: selectedCategory == nil) {
                            selectedCategory = nil
                            viewModel.filterByCategory(nil)
                        }
                        ForEach(viewModel.categories) { category in
                            CategoryPill(
                                label: category.name,
                                color: categoryColor(category.color),
                                isSelected: selectedCategory?.id == category.id
                            ) {
                                selectedCategory = selectedCategory?.id == category.id ? nil : category
                                viewModel.filterByCategory(selectedCategory)
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                }
                .background(Color(.systemBackground))
                Divider()
            }

            // Product grid
            if viewModel.isLoading {
                Spacer()
                ProgressView("Loading products...")
                Spacer()
            } else if viewModel.filteredProducts.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Image(systemName: "square.grid.2x2")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary.opacity(0.5))
                    Text(searchText.isEmpty ? "No products found" : "No results for \"\(searchText)\"")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else {
                ProductGridView(products: viewModel.filteredProducts) { product in
                    addToCart(product)
                }
            }
        }
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Cart Section (Landscape)

    private var cartSection: some View {
        CartView(onCheckout: { showCheckout = true })
            .background(Color(.systemBackground))
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .navigationBarLeading) {
            if let location = authService.selectedLocation {
                Button(action: {}) {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.circle.fill")
                            .foregroundColor(.secondary)
                        Text(location.name)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }

        ToolbarItem(placement: .navigationBarTrailing) {
            HStack(spacing: 16) {
                if let customer = cartService.selectedCustomer {
                    Button(action: { showCustomerPicker = true }) {
                        HStack(spacing: 4) {
                            Image(systemName: "person.circle.fill")
                                .foregroundColor(.blue)
                            Text(customer.firstName)
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                } else {
                    Button(action: { showCustomerPicker = true }) {
                        Image(systemName: "person.badge.plus")
                    }
                }

                if !cartService.isEmpty {
                    Button(role: .destructive, action: { cartService.clear() }) {
                        Image(systemName: "trash")
                    }
                }
            }
        }
    }

    private func addToCart(_ product: APIProduct) {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        cartService.addProduct(product)
    }

    private func categoryColor(_ hex: String?) -> Color {
        guard let hex = hex else { return .blue }
        return Color(hex: hex) ?? .blue
    }
}

// MARK: - Cart Drawer (portrait bottom sheet)

struct CartDrawerView: View {
    @EnvironmentObject var cartService: CartService
    @Binding var showCheckout: Bool
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            // Drag handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color(.systemFill))
                .frame(width: 36, height: 5)
                .padding(.vertical, 8)
                .onTapGesture { isExpanded.toggle() }

            if isExpanded {
                CartView(onCheckout: { showCheckout = true })
                    .frame(maxHeight: 400)
            } else {
                // Mini cart bar
                HStack {
                    HStack(spacing: 8) {
                        Text("\(cartService.itemCount)")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 24, height: 24)
                            .background(Color.blue)
                            .clipShape(Circle())
                        Text("items")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                    Spacer()
                    Text(cartService.total.currencyFormatted)
                        .font(.system(size: 17, weight: .bold))
                    Button(action: { showCheckout = true }) {
                        Text("Checkout")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .cornerRadius(10)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 20, y: -5)
        )
    }
}

// MARK: - View Model

@MainActor
final class POSViewModel: ObservableObject {
    @Published var allProducts: [APIProduct] = []
    @Published var filteredProducts: [APIProduct] = []
    @Published var categories: [APICategory] = []
    @Published var isLoading = false
    @Published var error: String?

    private var searchTask: Task<Void, Never>?

    func loadInitial() async {
        isLoading = true
        error = nil
        async let productsTask = APIService.shared.getProducts()
        async let categoriesTask = APIService.shared.getCategories()

        do {
            let (productResponse, cats) = try await (productsTask, categoriesTask)
            allProducts = productResponse.items
            filteredProducts = productResponse.items
            categories = cats
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func searchDebounced(_ query: String) {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
            guard !Task.isCancelled else { return }
            await search(query)
        }
    }

    private func search(_ query: String) async {
        if query.isEmpty {
            filteredProducts = allProducts
            return
        }
        let lower = query.lowercased()
        filteredProducts = allProducts.filter {
            $0.name.lowercased().contains(lower) ||
            ($0.sku?.lowercased().contains(lower) ?? false) ||
            ($0.barcode?.lowercased().contains(lower) ?? false)
        }
    }

    func filterByCategory(_ category: APICategory?) {
        if let category = category {
            filteredProducts = allProducts.filter { $0.categoryId == category.id }
        } else {
            filteredProducts = allProducts
        }
    }
}
