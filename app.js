// Inicializar Supabase
const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variables del DOM
const addForm = document.getElementById('add-form');
const productNameInput = document.getElementById('product-name');
const productCategoryInput = document.getElementById('product-category');
const productImageInput = document.getElementById('product-image');

// Función para agregar un producto
async function addProduct() {
    const name = productNameInput.value;
    const category = productCategoryInput.value;
    const file = productImageInput.files[0];

    if (!name || !category || !file) {
        alert("Por favor, complete todos los campos.");
        return;
    }

    try {
        // Subir la imagen a Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from('products')
            .upload(`public/${file.name}`, file);

        if (uploadError) {
            console.error('Error al subir la imagen:', uploadError);
            alert('Error al subir la imagen.');
            return;
        }

        // Obtener URL de la imagen subida
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/products/${data.path}`;

        // Guardar el producto en la base de datos
        const { data: product, error: dbError } = await supabase
            .from('productos')
            .insert([{
                nombre: name,
                categoria: category,
                imagen_url: imageUrl
            }]);

        if (dbError) {
            console.error('Error al agregar el producto:', dbError);
            alert('Error al agregar el producto: ' + dbError.message);
            return;
        }

        alert("Producto agregado exitosamente!");
        addForm.reset();  // Limpiar el formulario
    } catch (error) {
        console.error("Error al agregar producto: ", error);
        alert("Error al agregar: " + error.message);
    }
}

// Agregar el evento al botón de agregar producto
document.querySelector('#add-form button').addEventListener('click', addProduct);
