const API_BASE_URL = 'http://localhost:3070';

const CURRENT_USER_STORAGE_KEYS = {
    logged_in: 'is_logged_in',
    id: 'current_user_id',
    name: 'current_user_name',
    email: 'current_user_email',
    role: 'current_user_role'
};

function get_element(element_id) {
    return document.getElementById(element_id);
}

function get_input_value(element_id) {
    return get_element(element_id)?.value || '';
}

function get_trimmed_input_value(element_id) {
    return get_input_value(element_id).trim();
}

function get_number_input_value(element_id) {
    return Number.parseInt(get_input_value(element_id) || '0', 10);
}

function get_input_file(element_id) {
    return get_element(element_id)?.files?.[0] || null;
}

function navigate_to(page_path) {
    window.location.href = page_path;
}

function scroll_to_section(element_id) {
    get_element(element_id)?.scrollIntoView({ behavior: 'smooth' });
}

function escape_html(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function is_logged_in_user() {
    return localStorage.getItem(CURRENT_USER_STORAGE_KEYS.logged_in) === 'true';
}

function get_current_user_id() {
    const current_user_id = Number(localStorage.getItem(CURRENT_USER_STORAGE_KEYS.id) || '0');
    return current_user_id > 0 ? current_user_id : null;
}

function get_current_user_name() {
    return localStorage.getItem(CURRENT_USER_STORAGE_KEYS.name) || '';
}

function get_current_user_role() {
    return localStorage.getItem(CURRENT_USER_STORAGE_KEYS.role) || 'participant';
}

function is_admin_user() {
    return get_current_user_role() === 'admin';
}

function set_current_user(user_row) {
    localStorage.setItem(CURRENT_USER_STORAGE_KEYS.logged_in, 'true');
    localStorage.setItem(CURRENT_USER_STORAGE_KEYS.id, String(user_row.user_id));
    localStorage.setItem(CURRENT_USER_STORAGE_KEYS.name, user_row.user_name);
    localStorage.setItem(CURRENT_USER_STORAGE_KEYS.email, user_row.user_email);
    localStorage.setItem(CURRENT_USER_STORAGE_KEYS.role, user_row.user_role);
}

function clear_current_user() {
    Object.values(CURRENT_USER_STORAGE_KEYS).forEach((storage_key) => {
        localStorage.removeItem(storage_key);
    });
}

function get_request_error_message(request_error, fallback_message) {
    return (
        request_error?.response?.data?.message ||
        request_error?.response?.data?.error ||
        fallback_message
    );
}

function show_request_error(request_error, fallback_message) {
    console.error(request_error);
    alert(get_request_error_message(request_error, fallback_message));
}
