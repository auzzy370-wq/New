import SwiftUI
import Kingfisher

struct ProductGridView: View {
    let products: [APIProduct]
    let onTap: (APIProduct) -> Void

    private let columns = [GridItem(.adaptive(minimum: 130, maximum: 180), spacing: 8)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(products) { product in
                    ProductCard(product: product, onTap: { onTap(product) })
                }
            }
            .padding(10)
        }
    }
}

struct ProductCard: View {
    let product: APIProduct
    let onTap: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                // Product image
                ZStack {
                    if let imageUrl = product.imageUrl, let url = URL(string: imageUrl) {
                        KFImage(url)
                            .placeholder {
                                ProductPlaceholder(name: product.name)
                            }
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        ProductPlaceholder(name: product.name)
                    }
                }
                .frame(height: 100)
                .clipped()
                .cornerRadius(12, corners: [.topLeft, .topRight])

                // Product info
                VStack(alignment: .leading, spacing: 3) {
                    Text(product.name)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Text(product.price.currencyFormatted)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.blue)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
            .scaleEffect(isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.2), value: isPressed)
        }
        .buttonStyle(PressableButtonStyle(isPressed: $isPressed))
    }
}

struct ProductPlaceholder: View {
    let name: String

    private var initials: String {
        name.components(separatedBy: " ")
            .prefix(2)
            .compactMap { $0.first }
            .map { String($0) }
            .joined()
            .uppercased()
    }

    private var backgroundColor: Color {
        let colors: [Color] = [.blue, .purple, .green, .orange, .pink, .teal, .indigo]
        let index = abs(name.hashValue) % colors.count
        return colors[index]
    }

    var body: some View {
        ZStack {
            backgroundColor.opacity(0.15)
            Text(initials)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundColor(backgroundColor)
        }
    }
}

struct PressableButtonStyle: ButtonStyle {
    @Binding var isPressed: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .onChange(of: configuration.isPressed) { _, pressed in
                isPressed = pressed
            }
    }
}

// MARK: - Category Pill

struct CategoryPill: View {
    let label: String
    var color: Color = .blue
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? color : Color(.systemFill))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
        .animation(.spring(response: 0.25), value: isSelected)
    }
}

// MARK: - Corner radius helper

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
