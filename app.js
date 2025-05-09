
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

        // Parsear imagen (puede ser una sola string o un JSON array)
        let imagenes = [];
        try {
            imagenes = JSON.parse(p.imagen);
        } catch {
            if (typeof p.imagen === 'string') {
                imagenes = [p.imagen];
            }
        }

        // Crear contenedor de galería
        const gallery = document.createElement('div');
        gallery.className = 'image-gallery';

        imagenes.forEach((imgUrl, i) => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = p.nombre + ' ' + (i + 1);
            gallery.appendChild(img);
        });

        div.innerHTML = `
            <h3>${p.nombre}</h3>
            ${isAdmin ? `<button class="delete-btn" data-id="${p.id}">X</button>` : ''}
        `;
        div.insertBefore(gallery, div.firstChild);
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
    const files = fileInput.files;

    if (!nombre || !categoria || files.length === 0) {
        return alert('Completa todos los campos y selecciona al menos una imagen');
    }

    let imagenes = [];

    for (const file of files) {
        const filePath = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('productos')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error al subir imagen:', uploadError.message);
            continue;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('productos')
            .getPublicUrl(filePath);

        imagenes.push(publicUrl);
    }

    const { error: insertError } = await supabase
        .from('productos')
        .insert({ nombre, categoria, imagen: JSON.stringify(imagenes) });

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

