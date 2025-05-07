const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo'; // usa tu clave real aquí
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
const adminEmail = 'janikownahuel@gmail.com';

let allProducts = [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#login button').addEventListener('click', login);
    document.querySelector('#logout-container button').addEventListener('click', logout);
    document.querySelector('#admin-actions button').addEventListener('click', () => {
        document.getElementById('add-form').style.display = 'block';
    });
    document.querySelector('#add-form button').addEventListener('click', addProduct);

    checkAdmin();
});

async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.email === adminEmail) {
        isAdmin = true;
        document.getElementById('admin-actions').style.display = 'block';
        document.getElementById('logout-container').style.display = 'block';
        document.getElementById('login').style.display = 'none';
    } else {
        isAdmin = false;
        document.getElementById('admin-actions').style.display = 'none';
    }

    fetchProducts();
}

async function fetchProducts() {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) return alert('Error al obtener productos');
    allProducts = data;
    renderProducts(data);
}

function renderProducts(products) {
    const container = document.getElementById('product-list');
    container.innerHTML = '';

    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <h3>${p.nombre}</h3>
            <p>${p.categoria}</p>
            ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}">` : ''}
            ${isAdmin ? `<button class="delete-btn" data-id="${p.id}">X</button>` : ''}
        `;
        container.appendChild(div);
    });

    if (isAdmin) {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('¿Eliminar producto?')) {
                    await supabase.from('productos').delete().eq('id', id);
                    fetchProducts();
                }
            });
        });
    }
}

function filterByCategory(cat) {
    if (cat === 'todas') renderProducts(allProducts);
    else renderProducts(allProducts.filter(p => p.categoria === cat));
}

async function addProduct() {
    const nombre = document.getElementById('product-name').value;
    const categoria = document.getElementById('product-category').value;
    const file = document.getElementById('product-image').files[0];

    if (!nombre || !categoria || !file) return alert('Completa todos los campos.');

    const fileName = `public/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, file);
    if (uploadError) return alert('Error al subir imagen: ' + uploadError.message);

    const { data: urlData } = supabase.storage.from('productos').getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    const { error: insertError } = await supabase.from('productos').insert({
        nombre,
        categoria,
        imagen_url: imageUrl
    });

    if (insertError) {
        alert('Error al agregar producto: ' + insertError.message);
    } else {
        alert('Producto agregado');
        document.getElementById('add-form').style.display = 'none';
        document.getElementById('product-name').value = '';
        document.getElementById('product-category').value = '';
        document.getElementById('product-image').value = '';
        fetchProducts();
    }
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Error al iniciar sesión: ' + error.message);
    } else {
        alert('Sesión iniciada');
        checkAdmin();
    }
}

async function logout() {
    await supabase.auth.signOut();
    alert('Sesión cerrada');
    document.getElementById('login').style.display = 'block';
    document.getElementById('logout-container').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'none';
    document.getElementById('add-form').style.display = 'none';
    isAdmin = false;
    fetchProducts();
}
