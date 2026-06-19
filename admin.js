// admin.js

let products = [];
let sales = [];
let firestoreUnsubscribers = []; // Monitorador de conexão ativa

// MONITOR DO ESTADO DE LOGIN: Roda de forma automática ao carregar a página
firebase.auth().onAuthStateChanged((user) => {
    const loginScreen = document.getElementById("login-screen");
    const adminContent = document.getElementById("admin-content");

    if (user) {
        loginScreen.style.display = "none";
        adminContent.style.display = "block";
        loadAdminData();
    } else {
        loginScreen.style.display = "flex";
        adminContent.style.display = "none";
        disconnectListeners();
    }
});

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-pass").value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            document.getElementById("login-form").reset();
        })
        .catch((error) => {
            console.error("Erro de login:", error);
            alert("E-mail ou senha incorretos! Tente novamente.");
        });
}

function handleLogout() {
    if (confirm("Deseja realmente sair do painel administrativo?")) {
        firebase.auth().signOut();
    }
}

function loadAdminData() {
    disconnectListeners();

    const unsubProducts = db.collection("produtos").onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        renderAdminTable();
    });

    const unsubSales = db.collection("vendas").onSnapshot((snapshot) => {
        sales = [];
        snapshot.forEach(doc => {
            sales.push({ firebaseId: doc.id, ...doc.data() });
        });
        renderOpenSales();
        renderHistory();
        renderCashBox();
        updateSalesBadges(); // Atualiza contador de notificações
    });

    firestoreUnsubscribers.push(unsubProducts, unsubSales);
}

function disconnectListeners() {
    firestoreUnsubscribers.forEach(unsub => unsub());
    firestoreUnsubscribers = [];
}

// ATUALIZADO: Suporte de visualização para a nova aba "Vendas Abertas"
function switchTab(tab) {
    const stockSection = document.getElementById("section-stock");
    const historySection = document.getElementById("section-history");
    const cashSection = document.getElementById("section-cash");
    const openSalesSection = document.getElementById("section-open-sales");
    
    const stockBtn = document.getElementById("tab-stock-btn");
    const historyBtn = document.getElementById("tab-history-btn");
    const cashBtn = document.getElementById("tab-cash-btn");
    const openSalesBtn = document.getElementById("tab-open-sales-btn");

    stockSection.style.display = "none";
    historySection.style.display = "none";
    cashSection.style.display = "none";
    openSalesSection.style.display = "none";
    
    stockBtn.classList.remove("active");
    historyBtn.classList.remove("active");
    cashBtn.classList.remove("active");
    openSalesBtn.classList.remove("active");

    if (tab === "stock") {
        stockSection.style.display = "grid";
        stockBtn.classList.add("active");
    } else if (tab === "history") {
        historySection.style.display = "block";
        historyBtn.classList.add("active");
        renderHistory();
    } else if (tab === "cash") {
        cashSection.style.display = "block";
        cashBtn.classList.add("active");
        renderCashBox();
    } else if (tab === "open-sales") {
        openSalesSection.style.display = "block";
        openSalesBtn.classList.add("active");
        renderOpenSales();
    }
}

function renderAdminTable() {
    const tbody = document.getElementById("admin-product-rows");
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Nenhum produto em estoque.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(prod => {
        const hasDiscount = prod.discountPrice && parseFloat(prod.discountPrice) > 0;
        const pricesHtml = hasDiscount 
            ? `<span style="text-decoration: line-through; font-size: 0.8rem; color: #64748b;">R$ ${parseFloat(prod.price).toFixed(2)}</span> <strong style="color: var(--accent-color);">R$ ${parseFloat(prod.discountPrice).toFixed(2)}</strong>` 
            : `<strong>R$ ${parseFloat(prod.price).toFixed(2)}</strong>`;

        const stockCount = prod.stock !== undefined ? prod.stock : 0;
        const stockStyle = stockCount === 0 ? "color: #ef4444; font-weight: bold;" : "color: #10b981; font-weight: bold;";

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${prod.img || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(212,175,55,0.2);">
                        <div>
                            <strong style="color: white; font-size: 0.9rem;">${prod.title}</strong><br>
                            <span style="font-size: 0.72rem; color: var(--accent-color); font-weight: bold;">Cód: ${prod.code || 'S/C'}</span>
                        </div>
                    </div>
                </td>
                <td data-label="Classificação">
                    ${prod.category}<br>
                    <span style="font-size: 0.75rem; ${stockStyle}">Estoque: ${stockCount} un</span>
                </td>
                <td data-label="Preços">${pricesHtml}</td>
                <td data-label="Ações">
                    <button class="action-btn btn-edit" onclick="editProduct('${prod.id}')">Editar</button>
                    <button class="action-btn btn-delete" onclick="deleteProduct('${prod.id}')">Excluir</button>
                </td>
            </tr>
        `;
    }).join("");
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 380; 
            const scaleSize = MAX_WIDTH / img.width;
            
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            
            document.getElementById("img").value = compressedBase64;
            
            const previewImg = document.getElementById("img-preview");
            previewImg.src = compressedBase64;
            document.getElementById("img-preview-container").style.display = "block";
        };
    };
}

function handleProductSubmit(event) {
    event.preventDefault();

    if (!firebase.auth().currentUser) {
        alert("Sessão expirada. Faça login novamente.");
        return;
    }

    const idField = document.getElementById("prod-id").value;
    const code = document.getElementById("code").value.trim().toUpperCase();
    const title = document.getElementById("title").value;
    const category = document.getElementById("category").value;
    const price = parseFloat(document.getElementById("price").value);
    const discountPriceVal = document.getElementById("discountPrice").value;
    const discountPrice = discountPriceVal ? parseFloat(discountPriceVal) : 0;
    const stock = parseInt(document.getElementById("stock").value) || 0;
    const desc = document.getElementById("desc").value;
    const img = document.getElementById("img").value;

    const docId = idField ? idField : Date.now().toString();

    db.collection("produtos").doc(docId).set({
        code,
        title,
        category,
        price,
        discountPrice,
        stock,
        desc,
        img
    }).then(() => {
        resetForm();
    }).catch((err) => {
        console.error("Erro ao salvar produto no Firestore:", err);
        alert("Ocorreu um erro ao salvar o produto.");
    });
}

function editProduct(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    document.getElementById("prod-id").value = prod.id;
    document.getElementById("code").value = prod.code || "";
    document.getElementById("title").value = prod.title;
    document.getElementById("category").value = prod.category;
    document.getElementById("price").value = prod.price;
    document.getElementById("discountPrice").value = prod.discountPrice || "";
    document.getElementById("stock").value = prod.stock !== undefined ? prod.stock : 0;
    document.getElementById("desc").value = prod.desc;
    document.getElementById("img").value = prod.img || "";

    if (prod.img) {
        document.getElementById("img-preview").src = prod.img;
        document.getElementById("img-preview-container").style.display = "block";
    } else {
        document.getElementById("img-preview-container").style.display = "none";
    }

    document.getElementById("form-title").innerText = "Editar Produto";
    document.getElementById("btn-save").innerText = "Salvar Alterações";
    document.getElementById("btn-cancel").style.display = "block";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
    if (!firebase.auth().currentUser) return;

    if (confirm("Deseja realmente remover este produto?")) {
        db.collection("produtos").doc(id).delete().then(() => {
            resetForm();
        }).catch((err) => {
            console.error("Erro ao deletar produto no Firestore:", err);
        });
    }
}

function resetForm() {
    document.getElementById("product-form").reset();
    document.getElementById("prod-id").value = "";
    document.getElementById("img").value = "";
    document.getElementById("img-preview-container").style.display = "none";
    document.getElementById("form-title").innerText = "Cadastrar Produto";
    document.getElementById("btn-save").innerText = "Salvar Produto";
    document.getElementById("btn-cancel").style.display = "none";
}

/* HISTÓRICO DE COMPRAS E VENDAS ABERTAS */

// Atualiza o contador vermelho de notificações de vendas pendentes
function updateSalesBadges() {
    const openSalesCount = sales.filter(s => s.status === "Aberta" || !s.status).length;
    const badge = document.getElementById("open-sales-badge");
    
    if (openSalesCount > 0) {
        badge.innerText = openSalesCount;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

// NOVA FUNÇÃO: Renderiza as vendas em aberto com botões de Concretizar e Recusar
// Substitua estas 3 funções no seu admin.js

function renderOpenSales() {
    const container = document.getElementById("open-sales-container");
    const openSales = sales.filter(s => s.status === "Aberta" || !s.status);

    if (openSales.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma venda aguardando faturamento.</p>`;
        return;
    }

    const sortedOpen = openSales.slice().sort((a, b) => b.id - a.id);

    container.innerHTML = sortedOpen.map(sale => `
        <div class="history-card" style="border-color: #3b82f6;">
            <div class="history-header">
                <div>
                    <strong style="color: #3b82f6;">Pedido Aberto #${sale.id}</strong><br>
                    <span style="font-size: 0.8rem; color: #94a3b8;">Data: ${sale.date}</span>
                </div>
                <div class="history-total" style="color: #3b82f6;">Total: R$ ${parseFloat(sale.total).toFixed(2)}</div>
            </div>
            <div style="margin-bottom: 0.8rem; font-size: 0.9rem;">
                <p><strong>Cliente:</strong> ${sale.customerName}</p>
                <p><strong>WhatsApp:</strong> ${sale.customerPhone || 'Não informado'}</p> <!-- Atualizado -->
                <p><strong>Forma de Pagamento:</strong> ${sale.customerPayment}</p>
            </div>
            <div style="font-size: 0.85rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.8rem;">
                <strong>Itens do Pedido:</strong><br>
                ${sale.items.map(i => `• [Cód: ${i.code}] ${i.title} - ${i.quantity}x (R$ ${parseFloat(i.price).toFixed(2)}/un)`).join('<br>')}
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="action-btn" style="background-color: var(--whatsapp-color); color: white;" onclick="confirmSale('${sale.firebaseId}')">Concretizar Venda</button>
                <button class="action-btn btn-delete" style="margin-left: 0;" onclick="cancelSale('${sale.firebaseId}')">Recusar/Cancelar</button>
            </div>
        </div>
    `).join("");
}

function renderHistory() {
    const container = document.getElementById("history-container");
    const completedSales = sales.filter(s => s.status === "Concluída");

    if (completedSales.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma venda concluída no histórico.</p>`;
        return;
    }

    const sortedSales = completedSales.slice().sort((a, b) => b.id - a.id);

    container.innerHTML = sortedSales.map(sale => `
        <div class="history-card">
            <div class="history-header">
                <div>
                    <strong>Pedido #${sale.id}</strong><br>
                    <span style="font-size: 0.8rem; color: #94a3b8;">Data: ${sale.date}</span>
                </div>
                <div class="history-total">Total: R$ ${parseFloat(sale.total).toFixed(2)}</div>
            </div>
            <div style="margin-bottom: 0.8rem; font-size: 0.9rem;">
                <p><strong>Cliente:</strong> ${sale.customerName}</p>
                <p><strong>WhatsApp:</strong> ${sale.customerPhone || 'Não informado'}</p> <!-- Atualizado -->
                <p><strong>Forma de Pagamento:</strong> ${sale.customerPayment}</p>
            </div>
            <div style="font-size: 0.85rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.8rem;">
                <strong>Itens:</strong><br>
                ${sale.items.map(i => `• [Cód: ${i.code}] ${i.title} - ${i.quantity}x (R$ ${parseFloat(i.price).toFixed(2)}/un)`).join('<br>')}
            </div>
            <button class="action-btn btn-pdf" onclick="generatePDF('${sale.id}')">Gerar PDF</button>
        </div>
    `).join("");
}

function generatePDF(saleId) {
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Venda_Ebenezzer_Pedido_${sale.id}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
                .ticket { max-width: 700px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; }
                .logo-header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
                .logo-header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; color: #08162b; }
                .logo-header p { margin: 5px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; }
                .section-title { font-size: 14px; text-transform: uppercase; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; color: #08162b; font-weight: bold; }
                .info-table { width: 100%; margin-bottom: 20px; font-size: 13px; }
                .info-table td { padding: 4px 0; }
                .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                .items-table th { background-color: #f1f5f9; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
                .items-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                .total-box { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; color: #08162b; border-top: 2px solid #d4af37; padding-top: 10px; }
                @media print {
                    body { padding: 0; }
                    .ticket { border: none; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="logo-header">
                    <h1>LOJA EBENEZZER</h1>
                    <p>Livros que edificam • Fé que transforma</p>
                </div>
                
                <div class="section-title">Comprovante de Venda</div>
                <table class="info-table">
                    <tr><td><strong>Código do Pedido:</strong> #${sale.id}</td><td style="text-align: right;"><strong>Data:</strong> ${sale.date}</td></tr>
                    <tr><td colspan="2"><strong>Cliente:</strong> ${sale.customerName}</td></tr>
                    <tr><td colspan="2"><strong>WhatsApp:</strong> ${sale.customerPhone || 'Não informado'}</td></tr> <!-- Atualizado -->
                    <tr><td colspan="2"><strong>Forma de Pagamento:</strong> ${sale.customerPayment}</td></tr>
                </table>

                <div class="section-title">Itens Adquiridos</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Cód.</th>
                            <th>Descrição do Produto</th>
                            <th style="text-align: center;">Qtd</th>
                            <th style="text-align: right;">Preço Un.</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${item.code}</td>
                                <td>${item.title}</td>
                                <td style="text-align: center;">${item.quantity}</td>
                                <td style="text-align: right;">R$ ${parseFloat(item.price).toFixed(2)}</td>
                                <td style="text-align: right;">R$ ${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-box">
                    Valor Total: R$ ${parseFloat(sale.total).toFixed(2)}
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
// NOVA FUNÇÃO: Gera um Folder de Ofertas estático e profissional com todas as fotos e informações
// admin.js

// NOVA FUNÇÃO: Gera um arquivo de imagem PNG em altíssima definição pronto para compartilhar
function generateCatalogFolder() {
    if (products.length === 0) {
        alert("Cadastre produtos no estoque antes de gerar o folder de ofertas.");
        return;
    }

    alert("Gerando o folder de ofertas em alta definição... Aguarde um instante.");

    const exportArea = document.getElementById("folder-export-area");
    
    // Monta o layout do folder com largura fixa de 1080px (resolução padrão de celulares)
    exportArea.innerHTML = `
        <div style="background-image: linear-gradient(rgba(8, 22, 43, 0.85), rgba(4, 13, 26, 0.95)), url('background.jpg'); background-size: cover; background-position: center; border: 4px solid #d4af37; border-radius: 12px; padding: 50px 30px; margin-bottom: 35px; text-shadow: 0 3px 6px rgba(0,0,0,0.9); text-align: center;">
            <h1 style="margin: 0; color: #d4af37; font-size: 3.5rem; letter-spacing: 3px; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif;">LOJA EBENEZZER</h1>
            <p style="margin: 15px 0 0; font-size: 1.5rem; letter-spacing: 2px; color: #ffffff; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">LIVROS QUE EDIFICAM • FÉ QUE TRANSFORMA</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
            ${products.map(prod => {
                const hasDiscount = prod.discountPrice && parseFloat(prod.discountPrice) > 0;
                const finalPrice = hasDiscount ? parseFloat(prod.discountPrice) : parseFloat(prod.price);
                return `
                    <div style="background-color: rgba(13, 30, 54, 0.95); border: 2px solid rgba(212, 175, 55, 0.4); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; position: relative; box-sizing: border-box; min-height: 320px;">
                        ${hasDiscount ? `<span style="position: absolute; top: 12px; right: 12px; background-color: #ef4444; color: white; font-size: 0.75rem; font-weight: bold; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">Oferta</span>` : ''}
                        <img src="${prod.img || 'https://via.placeholder.com/250'}" style="width: 100%; height: 160px; object-fit: contain; background-color: rgba(16, 42, 69, 0.4); border-radius: 6px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 0.75rem; color: #d4af37; font-weight: bold; text-transform: uppercase; margin-bottom: 6px;">${prod.category}</div>
                            <div style="font-size: 1rem; font-weight: bold; color: #ffffff; margin: 6px 0; height: 44px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.2;">${prod.title}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px;">Cód: ${prod.code || 'S/C'}</div>
                        </div>
                        <div style="background-color: rgba(4, 13, 26, 0.75); border-radius: 8px; padding: 8px; border: 1.5px solid rgba(212, 175, 55, 0.2); text-align: center;">
                            ${hasDiscount ? `<div style="text-decoration: line-through; color: #64748b; font-size: 0.85rem; margin-bottom: 2px;">R$ ${parseFloat(prod.price).toFixed(2)}</div>` : ''}
                            <div style="font-size: 1.35rem; color: #d4af37; font-weight: bold;">R$ ${finalPrice.toFixed(2)}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Aguarda um pequeno intervalo para garantir a renderização das imagens
    setTimeout(() => {
        html2canvas(exportArea, {
            useCORS: true, // Permite carregar imagens externas se houver
            allowTaint: true,
            scale: 2 // Dobra a resolução para o panfleto ficar extremamente nítido na tela de qualquer celular
        }).then(canvas => {
            // Cria um link temporário para download do arquivo PNG
            const link = document.createElement('a');
            link.download = 'folder-ofertas-ebenezzer.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Limpa a área oculta de renderização
            exportArea.innerHTML = "";
        }).catch(err => {
            console.error("Erro ao gerar imagem:", err);
            alert("Ocorreu um erro ao converter o folder em imagem.");
        });
    }, 1200);
}

window.onload = loadAdminData;
// Cole este bloco de volta no seu admin.js
function renderCashBox() {
    const tbody = document.getElementById("admin-cash-rows");
    const completedSales = sales.filter(s => s.status === "Concluída");
    
    if (completedSales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #94a3b8;">Nenhum faturamento registrado ainda.</td></tr>`;
        return;
    }

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthlySummary = {};

    completedSales.forEach(sale => {
        try {
            const datePart = sale.date.split(',')[0] || sale.date.split(' ')[0];
            const parts = datePart.split('/');
            const monthIndex = parseInt(parts[1]) - 1;
            const year = parts[2];
            
            if (!isNaN(monthIndex) && year) {
                const label = `${monthNames[monthIndex]} / ${year}`;
                if (!monthlySummary[label]) {
                    monthlySummary[label] = 0;
                }
                monthlySummary[label] += parseFloat(sale.total);
            }
        } catch (e) {
            // Ignora erros
        }
    });

    const keys = Object.keys(monthlySummary);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #94a3b8;">Erro ao processar as datas das vendas.</td></tr>`;
        return;
    }

    tbody.innerHTML = keys.map(period => `
        <tr>
            <td style="font-weight: bold; color: white;">${period}</td>
            <td style="text-align: right; color: var(--accent-color); font-weight: bold; font-size: 1rem;">
                R$ ${monthlySummary[period].toFixed(2)}
            </td>
        </tr>
    `).join("");
}
// Cole este bloco de volta no seu admin.js
function cancelSale(firebaseId) {
    if (!firebase.auth().currentUser) return;

    const sale = sales.find(s => s.firebaseId === firebaseId);
    if (!sale) return;

    if (confirm("Deseja realmente recusar esta venda aberta? O estoque físico de todos os itens comprados será restaurado no banco de dados.")) {
        const batch = db.batch();

        sale.items.forEach(item => {
            if (item.productId) {
                const productRef = db.collection("produtos").doc(item.productId);
                // Incrementa de volta a quantidade comprada ao estoque do produto
                batch.update(productRef, {
                    stock: firebase.firestore.FieldValue.increment(item.quantity)
                });
            }
        });

        // Deleta a venda pendente do Firestore
        const saleRef = db.collection("vendas").doc(firebaseId);
        batch.delete(saleRef);

        batch.commit().then(() => {
            alert("Pedido cancelado e quantidades de estoque devolvidas com sucesso!");
        }).catch(err => {
            console.error("Erro ao recusar venda:", err);
        });
    }
}
// Cole este bloco de volta no seu admin.js
function confirmSale(firebaseId) {
    if (!firebase.auth().currentUser) return;
    
    // Altera o status da venda para "Concluída", somando o valor ao Caixa da Loja
    db.collection("vendas").doc(firebaseId).update({
        status: "Concluída"
    }).then(() => {
        alert("Venda concretizada com sucesso! O valor foi somado ao faturamento do Caixa.");
    }).catch(err => {
        console.error("Erro ao concretizar venda:", err);
    });
}
// Cole este bloco de volta no seu admin.js
function clearHistory() {
    if (!firebase.auth().currentUser) return;

    if (confirm("Esta ação apagará permanentemente todo o histórico de compras concluídas do Firestore. Continuar?")) {
        const batch = db.batch();
        
        // Busca apenas as vendas que possuem o status "Concluída" para deletar
        db.collection("vendas").where("status", "==", "Concluída").get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        }).catch((err) => {
            console.error("Erro ao limpar histórico de vendas:", err);
        });
    }
}

// ==========================================
// IMPORTAÇÃO DE PLANILHA EXCEL (.XLSX)
// ==========================================

function triggerExcelUpload() {
    document.getElementById("excel-file-input").click();
}

function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById("import-status");
    statusDiv.innerText = "Lendo arquivo...";
    statusDiv.style.display = "block";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            // raw: true impede que a biblioteca converta textos com vírgula em números errados
            const workbook = XLSX.read(data, { type: 'array', raw: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            processExcelData(jsonData);
        } catch (error) {
            console.error("Erro ao ler arquivo Excel:", error);
            alert("Erro ao processar o arquivo Excel. Verifique se o arquivo está corrompido ou formato incorreto.");
            statusDiv.style.display = "none";
        }
    };
    reader.onerror = function() {
        alert("Erro ao ler o arquivo do dispositivo.");
        statusDiv.style.display = "none";
    };
    reader.readAsArrayBuffer(file);
    
    // Reseta o valor do input para permitir fazer upload do mesmo arquivo logo em seguida
    event.target.value = "";
}

function normalizeHeader(str) {
    if (!str) return "";
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .trim()
        .replace(/\s+/g, "_")            // Substitui espaços por underline
        .replace(/[^a-z0-9_]/g, "");     // Mantém apenas letras, números e underline
}

function parsePrice(value) {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    
    let str = String(value).replace("R$", "").replace(/\s/g, "");
    if (str === "") return 0;
    
    const hasDot = str.includes(".");
    const hasComma = str.includes(",");
    
    if (hasDot && hasComma) {
        const dotIndex = str.indexOf(".");
        const commaIndex = str.indexOf(",");
        if (commaIndex > dotIndex) {
            // Formato BR (ex: 1.200,50) -> remove pontos, troca vírgula por ponto
            str = str.replace(/\./g, "").replace(",", ".");
        } else {
            // Formato US (ex: 1,200.50) -> remove vírgulas
            str = str.replace(/,/g, "");
        }
    } else if (hasComma) {
        // Apenas vírgula (ex: 199,99) -> substitui por ponto
        str = str.replace(",", ".");
    } else if (hasDot) {
        // Apenas ponto (ex: 199.99 ou 1.200)
        // Se houver exatamente 3 dígitos após o ponto, assume que é separador de milhar (ex: 1.200 -> 1200)
        const parts = str.split(".");
        if (parts.length === 2 && parts[1].length === 3) {
            str = str.replace(".", "");
        }
    }
    
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
}

function processExcelData(rows) {
    const statusDiv = document.getElementById("import-status");
    if (rows.length < 2) {
        alert("A planilha está vazia ou não possui cabeçalhos.");
        statusDiv.style.display = "none";
        return;
    }
    
    const headers = rows[0].map(h => normalizeHeader(h));
    
    // Mapeamento dinâmico dos cabeçalhos suportados para os campos oficiais do Firestore
    const fieldMap = {};
    headers.forEach((header, index) => {
        if (header === "codigo" || header === "code" || header === "cod") {
            fieldMap[index] = "code";
        } else if (header === "titulo" || header === "title" || header === "nome") {
            fieldMap[index] = "title";
        } else if (header === "categoria" || header === "category" || header === "classificacao") {
            fieldMap[index] = "category";
        } else if (header === "preco" || header === "price" || header === "preco_original") {
            fieldMap[index] = "price";
        } else if (header === "preco_promocional" || header === "discountprice" || header === "desconto" || header === "preco_desconto") {
            fieldMap[index] = "discountPrice";
        } else if (header === "estoque" || header === "stock" || header === "quantidade" || header === "qtd") {
            fieldMap[index] = "stock";
        } else if (header === "descricao" || header === "desc" || header === "sinopse" || header === "detalhes") {
            fieldMap[index] = "desc";
        } else if (header === "imagem" || header === "img" || header === "foto" || header === "url") {
            fieldMap[index] = "img";
        }
    });

    // Validar se as colunas mínimas essenciais foram mapeadas
    const mappedFields = Object.values(fieldMap);
    if (!mappedFields.includes("code") || !mappedFields.includes("title")) {
        alert("Erro na Planilha: Não encontramos as colunas de identificação obrigatórias.\n\nCertifique-se de ter pelo menos uma coluna chamada 'codigo' (ou 'code') e outra 'titulo' (ou 'nome').");
        statusDiv.style.display = "none";
        return;
    }

    const importedProducts = [];
    
    // Mapeia as linhas de dados (começando da linha index 1, pois index 0 são os cabeçalhos)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        // Verifica se a linha tem dados válidos (evita cadastrar produtos sem código/título)
        const codeIndex = headers.findIndex(h => h === "codigo" || h === "code" || h === "cod");
        const titleIndex = headers.findIndex(h => h === "titulo" || h === "title" || h === "nome");
        
        // Pula linhas que não tenham dados básicos
        if (codeIndex !== -1 && (row[codeIndex] === undefined || row[codeIndex] === null || String(row[codeIndex]).trim() === "")) {
            continue;
        }
        if (titleIndex !== -1 && (row[titleIndex] === undefined || row[titleIndex] === null || String(row[titleIndex]).trim() === "")) {
            continue;
        }

        const prod = {
            code: "",
            title: "",
            category: "Outros",
            price: 0,
            discountPrice: 0,
            stock: 0,
            desc: "",
            img: ""
        };

        row.forEach((value, index) => {
            const field = fieldMap[index];
            if (!field || value === undefined || value === null) return;

            if (field === "price" || field === "discountPrice") {
                const parsed = parsePrice(value);
                console.log(`[Import Excel Debug] Campo: ${field} | Valor Original:`, value, `| Tipo:`, typeof value, `| Parsed:`, parsed);
                prod[field] = parsed;
            } else if (field === "stock") {
                const parsed = parseInt(value, 10);
                prod[field] = isNaN(parsed) ? 0 : parsed;
            } else if (field === "code") {
                prod[field] = String(value).trim().toUpperCase();
            } else {
                prod[field] = String(value).trim();
            }
        });

        // Validação e normalização da categoria para as permitidas na loja
        const validCategories = ["Bíblia", "Bíblia de Estudo", "Livros", "Escola Bíblica", "Outros"];
        const normalizedCat = normalizeHeader(prod.category);
        let matchedCategory = "Outros";
        for (const validCat of validCategories) {
            if (normalizeHeader(validCat) === normalizedCat) {
                matchedCategory = validCat;
                break;
            }
        }
        prod.category = matchedCategory;

        if (prod.title && prod.code) {
            importedProducts.push(prod);
        }
    }

    if (importedProducts.length === 0) {
        alert("Nenhum produto válido para importação foi encontrado na planilha.");
        statusDiv.style.display = "none";
        return;
    }

    statusDiv.style.display = "none";
    if (confirm(`Encontrados ${importedProducts.length} produtos válidos na planilha.\n\nDeseja importá-los para o banco de dados da loja?\n(Produtos com o mesmo código serão atualizados mantendo imagens antigas caso a planilha venha em branco)`)) {
        uploadProductsToFirestore(importedProducts);
    }
}

function uploadProductsToFirestore(importedProducts) {
    const statusDiv = document.getElementById("import-status");
    statusDiv.innerText = "Preparando gravação em lote...";
    statusDiv.style.display = "block";

    let createdCount = 0;
    let updatedCount = 0;
    
    // Divide os produtos em pacotes (chunks) de até 400 itens para respeitar o limite de 500 do Batch do Firestore
    const chunks = [];
    const CHUNK_SIZE = 400;
    for (let i = 0; i < importedProducts.length; i += CHUNK_SIZE) {
        chunks.push(importedProducts.slice(i, i + CHUNK_SIZE));
    }

    let chunkIndex = 0;

    function processNextChunk() {
        if (chunkIndex >= chunks.length) {
            statusDiv.innerText = `Sucesso: ${createdCount} criados, ${updatedCount} atualizados!`;
            alert(`Importação finalizada!\n\n- Novos produtos adicionados: ${createdCount}\n- Produtos existentes atualizados: ${updatedCount}`);
            setTimeout(() => {
                statusDiv.style.display = "none";
            }, 5000);
            return;
        }

        const currentChunk = chunks[chunkIndex];
        const batch = db.batch();

        currentChunk.forEach(importedProd => {
            // Busca se o produto já existe no cache em memória 'products' carregado do Firestore
            const existing = products.find(p => p.code === importedProd.code);
            let docId;
            
            if (existing) {
                docId = existing.id;
                // Mescla dados: se na planilha o campo estiver vazio, preserva o valor atual do banco
                if (!importedProd.img && existing.img) importedProd.img = existing.img;
                if (!importedProd.desc && existing.desc) importedProd.desc = existing.desc;
                if (importedProd.price === 0 && existing.price) importedProd.price = existing.price;
                if (importedProd.discountPrice === 0 && existing.discountPrice) importedProd.discountPrice = existing.discountPrice;
                if (importedProd.stock === 0 && existing.stock) importedProd.stock = existing.stock;
                if (importedProd.category === "Outros" && existing.category && existing.category !== "Outros") {
                    importedProd.category = existing.category;
                }
                updatedCount++;
            } else {
                // Gera ID único se for produto novo
                docId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5);
                createdCount++;
            }

            const docRef = db.collection("produtos").doc(docId);
            batch.set(docRef, importedProd);
        });

        statusDiv.innerText = `Gravando lote ${chunkIndex + 1} de ${chunks.length} (${chunkIndex * CHUNK_SIZE + currentChunk.length} produtos)...`;

        batch.commit()
            .then(() => {
                chunkIndex++;
                // Aguarda um pequeno delay de 100ms para evitar gargalo e processa o próximo chunk
                setTimeout(processNextChunk, 100);
            })
            .catch(err => {
                console.error("Erro ao gravar lote no Firestore:", err);
                alert("Ocorreu um erro ao salvar o lote de produtos no Firestore. Processo interrompido.");
                statusDiv.innerText = "Erro na gravação.";
            });
    }

    processNextChunk();
}
