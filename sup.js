const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function getProducts() {
    const { data, error } = await supabase
        .from('productos')
        .select('*');
    if (error) console.error('Error fetching products:', error);
    else renderProducts(data);
}

async function addProduct() {
    const nombre = document.getElementById('nombre').value;
    const categoria = document.getElementById('categoria').value;
    
    const { data, error } = await supabase
        .from('productos')
        .insert([{ nombre, categoria }]);
    
    if (error) console.error('Error adding product:', error);
    else {
        alert('Producto agregado');
        closeAddProduct();
        getProducts();
    }
}

function filterCategory(categoria) {
    // Aquí puedes añadir lógica para filtrar los productos por categoría
    const filteredProducts = products.filter(product => product.categoria === categoria);
    renderProducts(filteredProducts);
}

function renderProducts(products) {
    const catalogo = document.getElementById('catalogo');
    catalogo.innerHTML = '';
    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product';
        productElement.innerHTML = `<h3>${product.nombre}</h3><p>${product.categoria}</p>`;
        catalogo.appendChild(productElement);
    });
}

function openAddProduct() {
    document.getElementById('add-product-modal').style.display = 'flex';
}

function closeAddProduct() {
    document.getElementById('add-product-modal').style.display = 'none';
}

// Llamada inicial para cargar productos
getProducts();