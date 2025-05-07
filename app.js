// Lógica de autenticación
async function checkAdmin() {
    const user = supabase.auth.user();
    if (user && user.email === 'janikownahuel@gmail.com') {
        document.getElementById('admin-actions').style.display = 'block';
    }
}

// Llamar a checkAdmin para verificar si el usuario es el administrador
checkAdmin();