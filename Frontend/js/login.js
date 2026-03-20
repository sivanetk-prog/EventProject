document.getElementById('login-form').addEventListener('submit', async (submit_event) => {
    submit_event.preventDefault();

    const user_email = document.getElementById('user_email').value.trim();
    const user_password = document.getElementById('user_password').value.trim();

    try {
        const login_response = await axios.post(`${API_BASE_URL}/auth/login`, {
            user_email,
            user_password
        });

        const { user_row } = login_response.data;

        set_current_user(user_row);

        await show_alert('เข้าสู่ระบบสำเร็จ!');
        window.location.href = 'index.html';
    } catch (request_error) {
        console.error(request_error);
        alert(get_request_error_message(request_error, 'ไม่สามารถเข้าสู่ระบบได้'));
    }
});
