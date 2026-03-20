const login_form = get_element('login-form');

if (login_form) {
    login_form.addEventListener('submit', async (submit_event) => {
        submit_event.preventDefault();

        const user_email = get_trimmed_input_value('user_email');
        const user_password = get_trimmed_input_value('user_password');

        try {
            const login_response = await axios.post(`${API_BASE_URL}/auth/login`, {
                user_email,
                user_password
            });

            set_current_user(login_response.data.user_row);
            await show_alert('เข้าสู่ระบบสำเร็จ!');
            navigate_to('index.html');
        } catch (request_error) {
            show_request_error(request_error, 'ไม่สามารถเข้าสู่ระบบได้');
        }
    });
}
