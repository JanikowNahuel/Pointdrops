// app.js (AJUSTADO PARA LA NUEVA ESTRUCTURA)

const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo';
const adminEmail = 'janikownahuel@gmail.com';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Estado de la aplicación
let allProducts = [];
let isAdmin = false;

// Elementos del DOM (¡AJUSTADOS a los nuevos IDs/Clases!)
const loginSection = document.getElementById('admin-login-section'); // Cambiado a section
const adminActionsSection = document.getElementById('admin-actions-section'); // Nueva sección para acciones de admin
const addProductForm = document.getElementById('add-product-form'); // Cambiado a form
const productListContainer = document.getElementById('product-list');
const categorySelect = document.getElementById('category-select');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await checkAdminStatus();
    fetchProducts();
    setupCarousel(); // Inicializar el carrusel
});

function setupEventListeners() {
    // Botones de autenticación y admin
    if (loginSection) { // Asegúrate de que existe
        loginSection.querySelector('.btn-primary').addEventListener('click', handleLogin);
    }
    if (adminActionsSection) { // Asegúrate de que existe
        adminActionsSection.querySelector('#logout-btn').addEventListener('click', handleLogout); // Añadido ID al botón
        adminActionsSection.querySelector('#show-add-product-form-btn').addEventListener('click', showAddProductForm); // Añadido ID al botón
    }
    
    // Botón de guardar producto
    if (addProductForm) { // Asegúrate de que existe
        addProductForm.querySelector('.btn-primary').addEventListener('click', handleAddProduct); // Usar la nueva clase btn-primary
    }

    // Filtro de categoría
    if (categorySelect) { // Asegúrate de que existe
        categorySelect.addEventListener('change', (e) => filterByCategory(e.target.value));
    }

    // Delegación de eventos para botones de eliminar
    if (productListContainer) { // Asegúrate de que existe
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
    }

    // Funcionalidad de Drag & Drop para la imagen
    setupDragAndDrop();

    // Listener para el botón "Ver Catálogo" en el hero
    document.getElementById('view-catalog-btn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('catalog-section').scrollIntoView({ behavior: 'smooth' });
    });
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
    if (!productListContainer) return; // Asegura que el contenedor exista

    productListContainer.innerHTML = ''; // Limpiar contenedor
    products.forEach(p => {
        const imagePath = p.imagen ? p.imagen.split('/').pop() : '';
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';
        productDiv.dataset.id = p.id;
        productDiv.dataset.imagePath = imagePath;

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
    if (loginSection) loginSection.classList.toggle('hidden', isAdmin);
    if (adminActionsSection) adminActionsSection.classList.toggle('hidden', !isAdmin);
    if (addProductForm) addProductForm.classList.add('hidden'); // Ocultar siempre el formulario de añadir al cambiar estado

    renderProducts(allProducts); // Volver a renderizar para actualizar botones de eliminar
}

async function handleLogin() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput.value;
    const password = passwordInput.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showNotification('Error', 'Email o contraseña incorrectos.', 'error');
    } else {
        showNotification('¡Éxito!', 'Sesión iniciada correctamente.', 'success');
        await checkAdminStatus();
        // Limpiar campos del formulario de login
        emailInput.value = '';
        passwordInput.value = '';
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
    if (addProductForm) addProductForm.classList.toggle('hidden');
}

async function handleAddProduct() {
    const productNameInput = document.getElementById('product-name');
    const productCategorySelect = document.getElementById('product-category');
    const productImageInput = document.getElementById('product-image');

    const nombre = productNameInput.value;
    const categoria = productCategorySelect.value;
    const file = productImageInput.files[0];

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
        if (addProductForm) addProductForm.classList.add('hidden');
        
        // Resetear campos del formulario
        productNameInput.value = '';
        productCategorySelect.value = '';
        productImageInput.value = ''; // Limpiar el input de archivo
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('image-preview').src = ''; // Limpiar preview

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
            if (imagePath) {
                const { error: removeError } = await supabase.storage.from('productos').remove([imagePath]);
                if (removeError) {
                    return showNotification('Error al eliminar imagen', removeError.message, 'error');
                }
            }
            const { error: deleteError } = await supabase.from('productos').delete().eq('id', id);

            if (deleteError) {
                showNotification('Error al eliminar producto', deleteError.message, 'error');
            } else {
                showNotification('Producto eliminado', 'El producto fue eliminado correctamente.', 'success');
                fetchProducts();
            }
        }
    });
}

// --- UTILIDADES ---
function showNotification(title, text, icon) {
    Swal.fire({ title, text, icon, timer: 3000, timerProgressBar: true });
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const imageInput = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');

    if (!dropZone || !imageInput || !imagePreview) return; // Asegura que los elementos existan

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

// --- CARRUSEL ---
let currentSlide = 0;
const slides = [
    'https://i.ibb.co/your-outfit-image-1.jpg', // Reemplaza con tus URLs
    'https://i.ibb.co/your-outfit-image-2.jpg',
    'https://i.ibb.co/your-outfit-image-3.jpg',
    // Añade más URLs de tus outfits aquí
];

function setupCarousel() {
    const carouselInner = document.querySelector('.carousel-inner');
    if (!carouselInner) return;

    carouselInner.innerHTML = slides.map((src, index) => `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${src}" alt="Outfit ${index + 1}">
        </div>
    `).join('');

    setInterval(nextSlide, 5000); // Cambia de slide cada 5 segundos
}

function nextSlide() {
    const carouselItems = document.querySelectorAll('.carousel-item');
    if (carouselItems.length === 0) return;

    carouselItems[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % carouselItems.length;
    carouselItems[currentSlide].classList.add('active');
}
