// Inicializar Supabase
const supabaseUrl = 'https://hifmffqdooihgotquxnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZm1mZnFkb29paGdvdHF1eG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTAxMzQsImV4cCI6MjA2MjE2NjEzNH0.3nprN0B0wsXmpMFEaAbaZLLHvo3jUs4FwhZjkc4fxqo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variables del DOM
const loginForm = document.getElementById('login');
const loginButton = loginForm.querySelector('button');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const logoutButton = document.getElementById('logout-container').querySelector('button');
const adminActions = document.getElementById('admin-actions');

// Función para iniciar sesión
async function login() {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    if (!email || !password) {
        alert("Por favor, ingrese email y contraseña.");
        return;
    }

    try {
        const { user, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        alert("Inicio de sesión exitoso.");
        loginForm.style.display = 'none';  // Ocultar formulario de login
        logoutButton.style.display = 'block';  // Mostrar botón de logout
        adminActions.style.display = 'block';  // Mostrar opciones de administrador

    } catch (error) {
        console.error('Error al iniciar sesión:', error.message);
        alert('Error al iniciar sesión: ' + error.message);
    }
}

// Función para cerrar sesión
async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Error al cerrar sesión:', error.message);
        alert('Error al cerrar sesión: ' + error.message);
        return;
    }

    alert("Sesión cerrada.");
    loginForm.style.display = 'block';  // Mostrar formulario de login
    logoutButton.style.display = 'none';  // Ocultar botón de logout
    adminActions.style.display = 'none';  // Ocultar opciones de administrador
}

// Añadir eventos
loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);

// Verificar si ya está autenticado
async function checkSession() {
    const user = supabase.auth.user();
    if (user) {
        loginForm.style.display = 'none';  // Ocultar formulario de login
        logoutButton.style.display = 'block';  // Mostrar botón de logout
        adminActions.style.display = 'block';  // Mostrar opciones de administrador
    } else {
        loginForm.style.display = 'block';  // Mostrar formulario de login
        logoutButton.style.display = 'none';  // Ocultar botón de logout
        adminActions.style.display = 'none';  // Ocultar opciones de administrador
    }
}

// Verificar la sesión al cargar la página
checkSession();
