import { supabase } from './supabase.js';

let productos = [];
let usuarioActual = null;
let indiceEditar = null;
let imagenEditadaBase64 = null;

async function obtenerProductos() {
  const { data, error } = await supabase.from('productos').select('*');
  if (error) return alert('Error al obtener productos');
  productos = data;
  mostrarProductos(productos);
}

function mostrarProductos(lista) {
  const contenedor = document.getElementById('productos');
  contenedor.innerHTML = '';
  lista.forEach((p, i) => {
    contenedor.innerHTML += `
      <div class="producto">
        <img src="${p.imagen}" alt="${p.nombre}" />
        <h3>${p.nombre}</h3>
        <p>Categoría: ${p.categoria}</p>
        ${usuarioActual ? `
          <button onclick="editarProducto(${i})">Editar</button>
          <button onclick="eliminarProducto(${p.id})">Eliminar</button>` : ''}
      </div>
    `;
  });
}

window.filtrarCategoria = function () {
  const cat = document.getElementById('categoria').value;
  if (cat === 'todos') {
    mostrarProductos(productos);
  } else {
    const filtrados = productos.filter(p => p.categoria === cat);
    mostrarProductos(filtrados);
  }
};

window.mostrarFormulario = () => {
  const form = document.getElementById('formularioProducto');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

function redimensionarImagen(file, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const max = 300;
      let w = img.width, h = img.height;
      if (w > h && w > max) h *= max / w, w = max;
      else if (h > max) w *= max / h, h = max;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/png'));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.agregarProducto = () => {
  const nombre = document.getElementById('nombreProducto').value;
  const categoria = document.getElementById('categoriaProducto').value;
  const archivo = document.getElementById('imagenProducto').files[0];
  if (!nombre || !archivo) return alert('Completá todos los campos');

  redimensionarImagen(archivo, async (imagenBase64) => {
    const { error } = await supabase.from('productos').insert({ nombre, categoria, imagen: imagenBase64 });
    if (error) return alert('Error al cargar producto');
    obtenerProductos();
  });
};

window.eliminarProducto = async (id) => {
  if (!confirm('¿Eliminar producto?')) return;
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) return alert('Error al eliminar');
  obtenerProductos();
};

window.editarProducto = (index) => {
  indiceEditar = index;
  const p = productos[index];
  document.getElementById('editarNombre').value = p.nombre;
  document.getElementById('editarCategoria').value = p.categoria;
  imagenEditadaBase64 = p.imagen;
  document.getElementById('popupEditar').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
};

document.getElementById('editarImagen').addEventListener('change', function () {
  const file = this.files[0];
  if (file) redimensionarImagen(file, (base64) => imagenEditadaBase64 = base64);
});

window.guardarEdicion = async () => {
  const nombre = document.getElementById('editarNombre').value;
  const categoria = document.getElementById('editarCategoria').value;
  const id = productos[indiceEditar].id;

  const { error } = await supabase.from('productos').update({ nombre, categoria, imagen: imagenEditadaBase64 }).eq('id', id);
  if (error) return alert('Error al guardar');
  cerrarPopup();
  obtenerProductos();
};

window.cerrarPopup = () => {
  document.getElementById('popupEditar').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
};

window.login = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Error al iniciar sesión');
  usuarioActual = data.user;
  document.getElementById('loginStatus').innerText = 'Sesión iniciada';
  document.getElementById('adminOnly').style.display = 'block';
  obtenerProductos();
};

window.logout = async () => {
  await supabase.auth.signOut();
  usuarioActual = null;
  document.getElementById('loginStatus').innerText = 'Sesión cerrada';
  document.getElementById('adminOnly').style.display = 'none';
  obtenerProductos();
};

supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    usuarioActual = data.session.user;
    document.getElementById('adminOnly').style.display = 'block';
  }
  obtenerProductos();
});
