const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo';
const adminEmail = 'janikownahuel@gmail.com';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let allProducts = [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('#login button').addEventListener('click', login);
    document.querySelector('#logout-container button').addEventListener('click', logout);
    document.querySelector('#admin-actions button').addEventListener('click', showAddProductForm);
    document.querySelector('#add-form button').addEventListener('click', addProduct);

    await checkAdmin(); // Esperar a saber si es admin o no
    fetchProducts();    // Ahora sí renderizamos productos con isAdmin correcto
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
            ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}">` : ''}
            <div class="separator"></div>
            <h3>${p.nombre}</h3>
            ${isAdmin ? `
                <button class="edit-btn" data-id="${p.id}">Editar</button>
                <button class="delete-btn" data-id="${p.id}">X</button>` : ''
            }
        `;
        container.appendChild(div);
    });

    if (isAdmin) {
        // Asignar la funcionalidad de edición y eliminación
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                editProduct(id);  // Llamar a la función editProduct
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                deleteProduct(id);  // Llamar a la función deleteProduct
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
    const filePath = `${Date.now()}_${file.name}`;


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
    const imagePath = imageUrl.split('/').slice(-1)[0];


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

async function editProduct(id) {
    // Obtener el producto con el ID específico
    const { data: producto, error: fetchError } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) {
        return alert('Error al obtener producto: ' + fetchError.message);
    }

    // Rellenar los campos del formulario con los datos actuales del producto
    document.getElementById('edit-product-name').value = producto.nombre;
    document.getElementById('edit-product-category').value = producto.categoria;
    document.getElementById('edit-image-preview').src = producto.imagen;
    document.getElementById('edit-image-preview').style.display = 'block';
    
    // Mostrar el formulario de edición
    document.getElementById('edit-form').style.display = 'block';

    // Al hacer clic en guardar cambios, se ejecutará la función saveEditProduct
    document.getElementById('save-edit-btn').onclick = () => saveEditProduct(id);
}

async function saveEditProduct(id) {
    const nombre = document.getElementById('edit-product-name').value;
    const categoria = document.getElementById('edit-product-category').value;
    const fileInput = document.getElementById('edit-product-image');
    const file = fileInput.files[0];
    let publicUrl = null;

    if (!nombre || !categoria) {
        return alert('Completa todos los campos');
    }

    // Si se selecciona una nueva imagen, la subimos
    if (file) {
        // Generar un nombre único para la nueva imagen
        const filePath = `${Date.now()}_${file.name}`;

        // Subir la nueva imagen al bucket
        const { error: uploadError } = await supabase.storage
            .from('productos')
            .upload(filePath, file);

        if (uploadError) {
            return alert('Error al subir imagen: ' + uploadError.message);
        }

        // Obtener la URL pública de la imagen
        const { data: { publicUrl: newPublicUrl } } = supabase.storage
            .from('productos')
            .getPublicUrl(filePath);

        publicUrl = newPublicUrl;
    }

    // Si no se selecciona una nueva imagen, usamos la imagen existente
    if (!publicUrl) {
        publicUrl = document.getElementById('edit-image-preview').src;
    }

    // Actualizar el producto en la base de datos
    const { error: updateError } = await supabase
        .from('productos')
        .update({ nombre, categoria, imagen: publicUrl })
        .eq('id', id);

    if (updateError) {
        alert('Error al actualizar: ' + updateError.message);
    } else {
        alert('Producto actualizado');
        document.getElementById('edit-form').style.display = 'none';  // Ocultar el formulario
        fetchProducts();  // Volver a cargar los productos
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
        document.getElementById('logout-container').style.display = 'block';
        document.getElementById('login').style.display = 'none';
    } else {
        isAdmin = false;
        document.getElementById('admin-actions').style.display = 'none';
        document.getElementById('logout-container').style.display = 'none';
        document.getElementById('login').style.display = 'block';
    }
}

document.getElementById('category-select').addEventListener('change', (e) => {
    filterByCategory(e.target.value);
});


window.filterByCategory = filterByCategory;

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const imageInput = document.getElementById('product-image');
  const imagePreview = document.getElementById('image-preview');

  dropZone.addEventListener('click', () => imageInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      imageInput.files = e.dataTransfer.files;
      showPreview(file);
    }
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file && file.type.startsWith('image/')) {
      showPreview(file);
    }
  });

  function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

