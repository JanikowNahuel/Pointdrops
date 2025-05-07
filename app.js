
const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo';
const adminEmail = 'janikownahuel@gmail.com';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let allProducts = [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#login button').addEventListener('click', login);
    document.querySelector('#logout-container button').addEventListener('click', logout);
    document.querySelector('#admin-actions button').addEventListener('click', showAddProductForm);
    document.querySelector('#add-form button').addEventListener('click', addProduct);
    fetchProducts();
    checkAdmin();
});

async function fetchProducts() {
    const { data, error } = await supabase.from('productos').select('*');
    if (data) {
        allProducts = data;
        renderProducts(data);
    }
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
            ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}">` : ''}
            ${isAdmin ? `<button class="delete-btn" data-id="${p.id}">X</button>` : ''}
        `;
        container.appendChild(div);
    });

    if (isAdmin) {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                deleteProduct(id);
            });
        });
    }
}

function filterByCategory(categoria) {
    if (categoria === 'todas') {
        renderProducts(allProducts);
    } else {
        renderProducts(allProducts.filter(p => p.categoria === categoria));
    }
}

function showAddProductForm() {
    document.getElementById('add-form').style.display = 'block';
}

async function addProduct() {
    const nombre = document.getElementById('product-name').value;
    const categoria = document.getElementById('product-category').value;
    const fileInput = document.getElementById('product-image');
    const file = fileInput.files[0];

    if (!nombre || !categoria || !file) {
        return alert('Completa todos los campos y selecciona una imagen');
    }

    // Generar un nombre único para la imagen
    const filePath = `public/${Date.now()}_${file.name}`;

    // Subir la imagen al bucket
    const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, file);

    if (uploadError) {
        return alert('Error al subir imagen: ' + uploadError.message);
    }

    // Obtener la URL pública de la imagen
    const { data: { publicUrl } } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

    // Guardar los datos del producto incluyendo la imagen
    const { error: insertError } = await supabase
        .from('productos')
        .insert({ nombre, categoria, imagen: publicUrl });

    if (insertError) {
        alert('Error al agregar: ' + insertError.message);
    } else {
        alert('Producto agregado');
        document.getElementById('add-form').style.display = 'none';
        fetchProducts();
    }
}


async function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto?')) return;

    // Obtener el producto para conocer la URL de la imagen
    const { data: producto, error: fetchError } = await supabase
        .from('productos')
        .select('imagen')
        .eq('id', id)
        .single();

    if (fetchError) {
        return alert('Error al obtener producto: ' + fetchError.message);
    }

    // Verificar que existe la imagen en el producto
    const imageUrl = producto.imagen;
    if (!imageUrl) {
        return alert('No se encontró la imagen para eliminar');
    }

    // Extraer la ruta relativa al bucket desde la URL pública
    const bucketUrl = 'https://hifmffqdooihgotquxnd.supabase.co/storage/v1/object/public/productos/';
    const imagePath = imageUrl.replace(bucketUrl, '');

    // Eliminar la imagen del bucket
    const { error: removeError } = await supabase.storage
        .from('productos')
        .remove([imagePath]);

    if (removeError) {
        return alert('Error al eliminar imagen: ' + removeError.message);
    }

    // Luego eliminar el producto de la base de datos
    const { error: deleteError } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

    if (deleteError) {
        alert('Error al eliminar producto: ' + deleteError.message);
    } else {
        alert('Producto eliminado y imagen eliminada del bucket');
        fetchProducts();
    }
}



async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Sesión iniciada');
        document.getElementById('login').style.display = 'none';
        document.getElementById('logout-container').style.display = 'block';
        checkAdmin();
    }
}

async function logout() {
    await supabase.auth.signOut();
    alert('Sesión cerrada');
    document.getElementById('logout-container').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'none';
    document.getElementById('add-form').style.display = 'none';
    document.getElementById('login').style.display = 'block';
    isAdmin = false;
    fetchProducts();
}

async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email === adminEmail) {
        isAdmin = true;
        document.getElementById('admin-actions').style.display = 'block';
    } else {
        isAdmin = false;
    }
    fetchProducts();
}
