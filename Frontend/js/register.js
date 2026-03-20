document.getElementById('register-form').addEventListener('submit', async (submit_event) => {
    submit_event.preventDefault();

    const user_name = document.getElementById('user_name').value.trim();
    const user_email = document.getElementById('user_email').value.trim();
    const user_phone = document.getElementById('user_phone').value.trim();
    const user_password = document.getElementById('user_password').value.trim();

    try {
        await axios.post(`${API_BASE_URL}/users/register`, {
            user_name,
            user_email,
            user_phone,
            user_password,
            user_role: 'participant'
        });

        await show_alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        window.location.href = 'login.html';
    } catch (request_error) {
        console.error(request_error);
        alert(get_request_error_message(request_error, 'ไม่สามารถสมัครสมาชิกได้'));
    }
});
