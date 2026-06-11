// app.js

const WHATSAPP_PHONE = "555199850164"; 

let products = [];
let cart = [];
let activeCategory = "Todos";

function initApp() {
    db.collection("produtos").onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        renderCategories();
        renderProducts(products);
    }, (error) => {
        console.error("Erro ao carregar produtos do Firestore:", error);
    });

    updateCartUI();
}

function renderCategories() {
    const categoriesContainer = document.getElementById("categories-container");
    const categories = ["Todos", ...new Set(products.map(p => p.category))];
    
    categoriesContainer.innerHTML = categories.map(cat => 
        `<button class="category-btn ${cat === activeCategory ? 'active' : ''}" onclick="filterProducts('${cat}', this)">${cat}</button>`
    ).join("");
}

function renderProducts(productsList) {
    const grid = document.getElementById("products-grid");
    if (productsList.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #94a3b8;'>Nenhum produto correspondente encontrado.</p>";
        return;
    }

    grid.innerHTML = productsList.map(prod => {
        const hasDiscount = prod.discountPrice && parseFloat(prod.discountPrice) > 0 && parseFloat(prod.discountPrice) < parseFloat(prod.price);
        const finalPrice = hasDiscount ? parseFloat(prod.discountPrice) : parseFloat(prod.price);
        
        const stockCount = prod.stock !== undefined ? prod.stock : 0;
        const outOfStock = stockCount <= 0;
        
        const buttonHtml = outOfStock 
            ? `<button class="add-to-cart-btn" style="background-color: #475569; color: #94a3b8; cursor: not-allowed;" disabled>Esgotado</button>`
            : `<button class="add-to-cart-btn" onclick="addToCart('${prod.id}')">Adicionar ao Carrinho</button>`;

        const stockMessage = outOfStock 
            ? `<span style="color: #ef4444; font-weight: bold; font-size: 0.65rem;">Indisponível</span>`
            : `<span style="color: #10b981; font-size: 0.65rem;">Estoque: ${stockCount} un</span>`;

        return `
            <div class="product-card">
                <img class="product-image" src="${prod.img || 'https://via.placeholder.com/250'}" alt="${prod.title}">
                <div class="product-info">
                    <span class="product-category">${prod.category}</span>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                        <span class="product-code">Cód: ${prod.code || 'S/C'}</span>
                        ${stockMessage}
                    </div>
                    <h3 class="product-title">${prod.title}</h3>
                    <p class="product-desc">${prod.desc}</p>
                    <div class="price-container">
                        ${hasDiscount ? `<span class="price-original">R$ ${parseFloat(prod.price).toFixed(2)}</span>` : ''}
                        <span class="price-current">R$ ${finalPrice.toFixed(2)}</span>
                        ${hasDiscount ? `<span class="discount-badge">Promo</span>` : ''}
                    </div>
                    ${buttonHtml}
                </div>
            </div>
        `;
    }).join("");
}

function filterProducts(category, element) {
    document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
    if (element) {
        element.classList.add("active");
    }
    
    activeCategory = category;
    applyFilters();
}

function applyFilters() {
    const searchText = document.getElementById("search-input").value.toLowerCase().trim();
    
    let filtered = products;

    if (activeCategory !== "Todos") {
        filtered = filtered.filter(p => p.category === activeCategory);
    }

    if (searchText !== "") {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchText) || 
            (p.code && p.code.toLowerCase().includes(searchText))
        );
    }

    renderProducts(filtered);
}

function searchProducts() {
    applyFilters();
}

function toggleCart() {
    document.getElementById("cart-drawer").classList.toggle("open");
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const availableStock = product.stock !== undefined ? product.stock : 0;
    const cartItem = cart.find(item => item.id === productId);
    const currentQtyInCart = cartItem ? cartItem.quantity : 0;

    if (currentQtyInCart + 1 > availableStock) {
        alert(`Desculpe! Só temos ${availableStock} unidade(s) deste produto em estoque.`);
        return;
    }

    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    document.getElementById("cart-drawer").classList.add("open");
}

function changeQuantity(id, change) {
    const item = cart.find(p => p.id === id);
    if (!item) return;

    const product = products.find(p => p.id === id);
    const availableStock = product ? (product.stock !== undefined ? product.stock : 0) : 0;

    if (change > 0 && item.quantity + change > availableStock) {
        alert(`Desculpe! Estoque máximo atingido para este item (${availableStock} un).`);
        return;
    }

    item.quantity += change;
    if (item.quantity <= 0) {
        cart = cart.filter(p => p.id !== id);
    }
    updateCartUI();
}

function clearCart() {
    if (confirm("Tem certeza de que deseja esvaziar o seu carrinho?")) {
        cart = [];
        updateCartUI();
    }
}

function updateCartUI() {
    const cartCount = document.getElementById("cart-count");
    const cartItemsDiv = document.getElementById("cart-items");
    const totalSpan = document.getElementById("cart-total-value");

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCount.innerText = totalItems;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = "<p style='text-align: center; color: #94a3b8; margin-top: 2rem;'>O carrinho está vazio.</p>";
        totalSpan.innerText = "R$ 0,00";
        return;
    }

    cartItemsDiv.innerHTML = cart.map(item => {
        const itemPrice = item.discountPrice && parseFloat(item.discountPrice) > 0 ? parseFloat(item.discountPrice) : parseFloat(item.price);
        return `
            <div class="cart-item">
                <img class="cart-item-img" src="${item.img || 'https://via.placeholder.com/60'}" alt="${item.title}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">R$ ${itemPrice.toFixed(2)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    const totalSum = cart.reduce((acc, item) => {
        const price = item.discountPrice && parseFloat(item.discountPrice) > 0 ? parseFloat(item.discountPrice) : parseFloat(item.price);
        return acc + (price * item.quantity);
    }, 0);
    
    totalSpan.innerText = `R$ ${totalSum.toFixed(2)}`;
}

// Substitua a função sendWhatsAppOrder(event) no seu app.js
function sendWhatsAppOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
        alert("O seu carrinho está vazio.");
        return;
    }

    const name = document.getElementById("cust-name").value;
    const clientPhone = document.getElementById("cust-phone").value; // Captura o celular
    const payment = document.getElementById("cust-payment").value;

    let message = `*NOVO PEDIDO - LOJA EBENEZZER*\n`;
    message += `===============================\n\n`;
    message += `👤 *Cliente:* ${name}\n`;
    message += `📱 *WhatsApp:* ${clientPhone}\n`; // Adicionado na mensagem
    message += `💳 *Pagamento:* ${payment}\n\n`;
    message += `📦 *ITENS DO PEDIDO:*\n`;

    let totalSum = 0;
    const itemsSave = []; 

    const batch = db.batch();

    cart.forEach(item => {
        const itemPrice = item.discountPrice && parseFloat(item.discountPrice) > 0 ? parseFloat(item.discountPrice) : parseFloat(item.price);
        const subtotal = itemPrice * item.quantity;
        totalSum += subtotal;

        message += `• *Cód:* ${item.code || 'N/A'} - ${item.title}\n`;
        message += `  *Qtd:* ${item.quantity}x | *Un:* R$ ${itemPrice.toFixed(2)} | *Sub:* R$ ${subtotal.toFixed(2)}\n\n`;

        itemsSave.push({
            productId: item.id, 
            code: item.code || "S/C",
            title: item.title,
            quantity: item.quantity,
            price: itemPrice
        });

        const productRef = db.collection("produtos").doc(item.id);
        const currentStock = item.stock !== undefined ? item.stock : 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        
        batch.update(productRef, { stock: newStock });
    });

    message += `===============================\n`;
    message += `💰 *TOTAL GERAL:* R$ ${totalSum.toFixed(2)}\n`;
    message += `===============================\n\n`;
    message += `_Aguardando confirmação de faturamento do lojista._`;

    // Grava a venda na coleção "vendas" do Firestore com o celular do cliente
    const newSaleRef = db.collection("vendas").doc();
    batch.set(newSaleRef, {
        id: Date.now(),
        date: new Date().toLocaleString('pt-BR'),
        customerName: name,
        customerPhone: clientPhone, // Atualizado de customerAddress para customerPhone
        customerPayment: payment,
        items: itemsSave,
        total: totalSum,
        status: "Aberta" 
    });

    batch.commit().then(() => {
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodedMessage}`;

        cart = [];
        updateCartUI();
        document.getElementById("checkout-form").reset();
        toggleCart();

        window.open(whatsappUrl, '_blank');
    }).catch((err) => {
        console.error("Erro ao registrar venda e estoque no Firebase:", err);
        alert("Ocorreu um erro ao salvar o pedido. Tente novamente.");
    });
}

window.onload = initApp;