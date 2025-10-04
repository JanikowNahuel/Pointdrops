const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo';
const adminEmail = 'janikownahuel@gmail.com';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Estado de la aplicación
let allProducts = [];
let isAdmin = false;

// Elementos del DOM
const loginForm = document.getElementById('login');
const adminActionsContainer = document.getElementById('admin-actions-container');
const addProductForm = document.getElementById('add-form');
const productListContainer = document.getElementById('product-list');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await checkAdminStatus();
    fetchProducts();
});

function setupEventListeners() {
    // Formularios y botones principales
    loginForm.querySelector('button').addEventListener('click', handleLogin);
    adminActionsContainer.querySelector('#logout-container button').addEventListener('click', handleLogout);
    adminActionsContainer.querySelector('#admin-actions button').addEventListener('click', showAddProductForm);
    addProductForm.querySelector('button').addEventListener('click', handleAddProduct);

    // Filtro de categoría
    document.getElementById('category-select').addEventListener('change', (e) => filterByCategory(e.target.value));

    // Delegación de eventos para botones de eliminar
    productListContainer.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const productItem = e.target.closest('.product-item');
            if (productItem) {
                const id = productItem.dataset.id;
                const imagePath = productItem.dataset.imagePath;
                handleDeleteProduct(id, imagePath);
            }
        }
    });

    // Funcionalidad de Drag & Drop para la imagen
    setupDragAndDrop();
}

// --- RENDERIZADO Y MANEJO DE PRODUCTOS ---
async function fetchProducts() {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }
    if (data) {
        allProducts = data;
        renderProducts(allProducts);
    }
}

function renderProducts(products) {
    productListContainer.innerHTML = ''; // Limpiar contenedor
    products.forEach(p => {
        // Extraer solo la parte final de la URL de la imagen para usar en la eliminación
        const imagePath = p.imagen ? p.imagen.split('/').pop() : '';

        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';
        productDiv.dataset.id = p.id;
        productDiv.dataset.imagePath = imagePath; // Añadimos la ruta para no tener que consultarla luego

        productDiv.innerHTML = `
            ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}">` : ''}
            <h3>${p.nombre}</h3>
            ${isAdmin ? `<button class="delete-btn" title="Eliminar producto">X</button>` : ''}
        `;
        productListContainer.appendChild(productDiv);
    });
}

function filterByCategory(categoria) {
    const filteredProducts = categoria === 'todas'
        ? allProducts
        : allProducts.filter(p => p.categoria === categoria);
    renderProducts(filteredProducts);
}

// --- AUTENTICACIÓN Y ESTADO DE ADMIN ---
async function checkAdminStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    isAdmin = user && user.email === adminEmail;
    updateAdminUI();
}

function updateAdminUI() {
    if (isAdmin) {
        loginForm.classList.add('hidden');
        adminActionsContainer.classList.remove('hidden');
    } else {
        loginForm.classList.remove('hidden');
        adminActionsContainer.classList.add('hidden');
        addProductForm.classList.add('hidden');
    }
    // Volver a renderizar los productos para mostrar u ocultar los botones de eliminar
    renderProducts(allProducts);
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showNotification('Error', 'Email o contraseña incorrectos.', 'error');
    } else {
        showNotification('¡Éxito!', 'Sesión iniciada correctamente.', 'success');
        await checkAdminStatus();
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    isAdmin = false;
    updateAdminUI();
    showNotification('Sesión cerrada', '', 'info');
}

// --- ACCIONES DE ADMINISTRADOR (CRUD) ---
function showAddProductForm() {
    addProductForm.classList.toggle('hidden');
}

async function handleAddProduct() {
    const nombre = document.getElementById('product-name').value;
    const categoria = document.getElementById('product-category').value;
    const file = document.getElementById('product-image').files[0];

    if (!nombre || !categoria || !file) {
        return showNotification('Campos incompletos', 'Por favor, completa todos los campos y selecciona una imagen.', 'warning');
    }

    const filePath = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('productos').upload(filePath, file);

    if (uploadError) {
        return showNotification('Error de subida', uploadError.message, 'error');
    }

    const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(filePath);

    const { error: insertError } = await supabase.from('productos').insert({ nombre, categoria, imagen: publicUrl });

    if (insertError) {
        showNotification('Error al guardar', insertError.message, 'error');
    } else {
        showNotification('¡Producto agregado!', 'El nuevo producto ya está en el catálogo.', 'success');
        addProductForm.classList.add('hidden');
        addProductForm.reset();
        document.getElementById('image-preview').classList.add('hidden');
        fetchProducts();
    }
}

function handleDeleteProduct(id, imagePath) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esta acción.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, ¡eliminar!',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            // 1. Eliminar imagen del Storage (si existe)
            if (imagePath) {
                const { error: removeError } = await supabase.storage.from('productos').remove([imagePath]);
                if (removeError) {
                    return showNotification('Error al eliminar imagen', removeError.message, 'error');
                }
            }
            // 2. Eliminar producto de la base de datos
            const { error: deleteError } = await supabase.from('productos').delete().eq('id', id);

            if (deleteError) {
                showNotification('Error al eliminar producto', deleteError.message, 'error');
            } else {
                showNotification('Producto eliminado', 'El producto fue eliminado correctamente.', 'success');
                fetchProducts(); // Actualizar la vista
            }
        }
    });
}

// --- UTILIDADES ---
function showNotification(title, text, icon) {
    // Esta función usa SweetAlert2. Si no lo quieres, puedes reemplazarla por `alert(text)`.
    Swal.fire({ title, text, icon, timer: 3000, timerProgressBar: true });
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const imageInput = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');

    dropZone.addEventListener('click', () => imageInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            imageInput.files = e.dataTransfer.files;
            showImagePreview(file);
        }
    });
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) showImagePreview(file);
    });

    function showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}
