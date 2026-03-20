const register_form = get_element('register-form');

if (register_form) {
    register_form.addEventListener('submit', async (submit_event) => {
        submit_event.preventDefault();

        const user_name = get_trimmed_input_value('user_name');
        const user_email = get_trimmed_input_value('user_email');
        const user_phone = get_trimmed_input_value('user_phone');
        const user_password = get_trimmed_input_value('user_password');

        try {
            await axios.post(`${API_BASE_URL}/users/register`, {
                user_name,
                user_email,
                user_phone,
                user_password,
                user_role: 'participant'
            });

            await show_alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            navigate_to('login.html');
        } catch (request_error) {
            show_request_error(request_error, 'ไม่สามารถสมัครสมาชิกได้');
        }
    });
}
