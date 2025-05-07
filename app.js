// Lógica de autenticación

async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email === 'janikownahuel@gmail.com') {
        document.getElementById('admin-actions').style.display = 'block';
    }
}

// Llamar a checkAdmin para verificar si el usuario es el administrador
checkAdmin();

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { user, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Error al iniciar sesión: ' + error.message);
    } else {
        alert('Sesión iniciada');
        document.getElementById('login').style.display = 'none';
        document.getElementById('logout-container').style.display = 'block';
        checkAdmin(); // mostrar botón de agregar si es admin
    }
}

async function logout() {
    await supabase.auth.signOut();
    alert('Sesión cerrada');
    document.getElementById('logout-container').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'none';
    document.getElementById('login').style.display = 'block';
}
