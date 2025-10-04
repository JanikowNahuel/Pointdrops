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



// --- CARRUSEL (NUEVA LÓGICA COVERFLOW 3D) ---
let currentIndex = 0;
let slides = [
    'https://i.pinimg.com/736x/49/3b/81/493b81907bb68f4d2ec4a838242d7215.jpg', // Reemplaza con tus URLs
    'https://i.pinimg.com/1200x/2a/f8/84/2af884620d40a2819c9b99c822575236.jpg',
    'https://i.pinimg.com/736x/82/98/8a/82988a6476d5cc29a58c3a192e07d9a4.jpg',
    'https://i.pinimg.com/736x/f9/34/6d/f9346d1c8157d295c4b7bd38921e8aeb.jpg',
    'https://i.pinimg.com/736x/96/71/a8/9671a81fee02ebdfbc159bb011bd7823.jpg',
    'https://i.pinimg.com/1200x/72/cd/60/72cd60aac7c6a99e4da3f21e8e9ed1ee.jpg',
    'https://i.pinimg.com/736x/17/c6/19/17c619e21ef0ee24b4a42e68d960b567.jpg',
    'https://i.pinimg.com/736x/eb/4d/a3/eb4da30e8ae872ff29fd0b50e1101e1c.jpg',
    'https://i.pinimg.com/736x/78/84/f9/7884f91849c7a0c58221af5b378f31f6.jpg',
];
let totalSlides = slides.length;
let carouselInterval;

function setupCarousel() {
    const carouselInner = document.querySelector('.carousel-inner');
    const prevButton = document.querySelector('.carousel-control.prev');
    const nextButton = document.querySelector('.carousel-control.next');

    if (!carouselInner || !prevButton || !nextButton) return;

    // Poblar el carrusel con las imágenes
    carouselInner.innerHTML = slides.map((src, index) => `
        <div class="carousel-item" data-index="${index}">
            <img src="${src}" alt="Outfit ${index + 1}">
        </div>
    `).join('');

    // Configurar listeners para los botones
    prevButton.addEventListener('click', () => {
        navigateCarousel(-1);
        resetCarouselInterval();
    });
    nextButton.addEventListener('click', () => {
        navigateCarousel(1);
        resetCarouselInterval();
    });

    updateCarousel();
    startCarouselInterval(); // Iniciar el carrusel automático
}

function updateCarousel() {
    const items = document.querySelectorAll('.carousel-item');
    
    // Calcular los índices para las diapositivas anterior y siguiente
    const prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    const nextIndex = (currentIndex + 1) % totalSlides;

    items.forEach((item, index) => {
        item.classList.remove('active', 'prev', 'next');

        if (index === currentIndex) {
            item.classList.add('active');
        } else if (index === prevIndex) {
            item.classList.add('prev');
        } else if (index === nextIndex) {
            item.classList.add('next');
        }
    });
}

function navigateCarousel(direction) {
    currentIndex = (currentIndex + direction + totalSlides) % totalSlides;
    updateCarousel();
}

// Funciones para el carrusel automático
function startCarouselInterval() {
    carouselInterval = setInterval(() => {
        navigateCarousel(1); // Mueve a la siguiente diapositiva
    }, 5000); // Cambia de slide cada 5 segundos
}

function resetCarouselInterval() {
    clearInterval(carouselInterval);
    startCarouselInterval();
}

// Llamamos a setupCarousel al cargar la página (ya lo tienes en DOMContentLoaded)
