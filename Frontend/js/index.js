let event_list = [];
let current_event_id = null;

const $ = get_element;

function get_event_by_id(event_id) {
    return event_list.find((event_row) => Number(event_row.event_id) === Number(event_id)) || null;
}

function can_manage_event(event_row) {
    if (!event_row) {
        return false;
    }

    return (
        is_admin_user() ||
        Number(event_row.created_by_user_id) === Number(get_current_user_id())
    );
}

function can_cancel_registration(registration_row) {
    const current_user_id = get_current_user_id();

    if (!current_user_id || !registration_row) {
        return false;
    }

    return is_admin_user() || Number(registration_row.user_id) === Number(current_user_id);
}

function is_cancelled_registration(registration_row) {
    return String(registration_row?.registration_status || '').trim().toLowerCase() === 'cancelled';
}

function get_role_label(user_role) {
    const normalized_role = String(user_role || '').trim().toLowerCase();

    if (normalized_role === 'admin') {
        return 'ผู้ดูแลระบบ';
    }

    if (normalized_role === 'participant') {
        return 'ผู้เข้าร่วม';
    }

    return String(user_role || '-').trim() || '-';
}

function get_registration_status_label(registration_status) {
    const normalized_status = String(registration_status || '').trim().toLowerCase();

    if (!normalized_status) {
        return '-';
    }

    if (normalized_status === 'pending') {
        return 'รอดำเนินการ';
    }

    if (normalized_status === 'cancelled') {
        return 'ยกเลิกการลงทะเบียน';
    }

    return String(registration_status).trim();
}

function set_element_display(element_id, display_value) {
    const element = $(element_id);

    if (element) {
        element.style.display = display_value;
    }
}

function split_full_name(full_name) {
    const name_parts = String(full_name || '').trim().split(/\s+/).filter(Boolean);

    if (name_parts.length === 0) {
        return { first_name: '', last_name: '' };
    }

    if (name_parts.length === 1) {
        return { first_name: name_parts[0], last_name: '' };
    }

    return {
        first_name: name_parts[0],
        last_name: name_parts.slice(1).join(' ')
    };
}

function get_registration_full_name(registration_row) {
    const full_name = [
        String(registration_row?.first_name || '').trim(),
        String(registration_row?.last_name || '').trim()
    ]
        .filter(Boolean)
        .join(' ');

    return full_name || String(registration_row?.user_name || '').trim() || '-';
}

function read_file_as_data_url(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        const file_reader = new FileReader();
        file_reader.onload = () => resolve(file_reader.result);
        file_reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
        file_reader.readAsDataURL(file);
    });
}

function set_image_preview(preview_container, preview_image, image_source) {
    if (!preview_container || !preview_image) {
        return;
    }

    if (!image_source) {
        preview_container.style.display = 'none';
        preview_image.removeAttribute('src');
        preview_image.onerror = null;
        return;
    }

    preview_image.onerror = () => {
        preview_container.style.display = 'none';
        preview_image.removeAttribute('src');
    };
    preview_image.src = image_source;
    preview_container.style.display = 'block';
}

function get_image_url(event_image) {
    const normalized_event_image = String(event_image || '').trim();

    if (!normalized_event_image) {
        return '';
    }

    if (
        normalized_event_image.startsWith('http://') ||
        normalized_event_image.startsWith('https://')
    ) {
        return normalized_event_image;
    }

    return `${API_BASE_URL}${normalized_event_image.startsWith('/') ? normalized_event_image : `/${normalized_event_image}`}`;
}

function build_event_image_html(event_row) {
    const event_image_url = get_image_url(event_row.event_image);

    if (!event_image_url) {
        return '<div class="no-image">ไม่มีรูปภาพ</div>';
    }

    return `<img class="event-image" src="${escape_html(event_image_url)}" alt="${escape_html(event_row.event_name)}" onerror="handle_event_image_error(event)">`;
}

window.handle_event_image_error = (error_event) => {
    const failed_image = error_event?.target;

    if (!failed_image) {
        return;
    }

    failed_image.outerHTML = '<div class="no-image">ไม่มีรูปภาพ</div>';
};

function get_event_form_values(prefix = '') {
    const field_prefix = prefix ? `${prefix}_` : '';
    const field_id = (field_name) => `${field_prefix}${field_name}`;

    return {
        event_name: get_trimmed_input_value(field_id('event_name')),
        event_date: get_input_value(field_id('event_date')),
        event_time: get_input_value(field_id('event_time')),
        event_location: get_trimmed_input_value(field_id('event_location')),
        event_capacity: get_number_input_value(field_id('event_capacity')),
        event_description: get_trimmed_input_value(field_id('event_description')),
        event_image_file: get_input_file(field_id('event_image_file'))
    };
}

function get_registration_form_values() {
    const first_name = get_trimmed_input_value('first_name');
    const last_name = get_trimmed_input_value('last_name');

    return {
        first_name,
        last_name,
        gender: get_trimmed_input_value('gender'),
        age: get_trimmed_input_value('age'),
        food_allergies: get_trimmed_input_value('food_allergies'),
        participant_name: `${first_name} ${last_name}`.trim()
    };
}

function reset_registration_form() {
    const register_form = $('register-form');

    if (register_form) {
        register_form.reset();
    }
}

function fill_registration_form(name_parts, is_logged_in) {
    if ($('first_name')) $('first_name').value = is_logged_in ? name_parts.first_name : '';
    if ($('last_name')) $('last_name').value = is_logged_in ? name_parts.last_name : '';
    if ($('gender')) $('gender').value = '';
    if ($('age')) $('age').value = '';
    if ($('food_allergies')) $('food_allergies').value = '';
}

function setup_login_ui() {
    const logged_in = is_logged_in_user();
    const login_link = $('login-link');
    const user_greeting = $('user-greeting');
    const logout_btn = $('logout-btn');
    const create_event_link = $('create-event-link');

    set_element_display('create-event', logged_in ? 'block' : 'none');

    if (create_event_link) {
        create_event_link.style.display = logged_in ? 'inline-flex' : 'none';
    }

    if (!logged_in) {
        if (login_link) login_link.style.display = 'inline-flex';
        if (user_greeting) user_greeting.style.display = 'none';
        if (logout_btn) logout_btn.style.display = 'none';
        return;
    }

    if (login_link) {
        login_link.style.display = 'none';
    }

    if (user_greeting) {
        user_greeting.textContent = `สวัสดี, ${get_current_user_name()} (${get_role_label(get_current_user_role())})`;
        user_greeting.style.display = 'inline';
    }

    if (logout_btn) {
        logout_btn.style.display = 'inline-flex';
    }
}

function normalize_event_list(event_rows) {
    return event_rows.map((event_row) => ({
        event_id: Number(event_row.event_id || 0),
        event_name: event_row.event_name || '',
        event_date: event_row.event_date || '',
        event_time: event_row.event_time || '',
        event_location: event_row.event_location || '',
        event_capacity: Number(event_row.event_capacity || 0),
        event_description: event_row.event_description || '',
        event_image: event_row.event_image || '',
        created_by_user_id: Number(event_row.created_by_user_id || 0),
        created_by_user_name: event_row.created_by_user_name || '',
        registration_count: Number(event_row.registration_count || 0)
    }));
}

function format_event_date(event_date) {
    if (!event_date) {
        return '-';
    }

    const date_value = new Date(event_date);

    if (Number.isNaN(date_value.getTime())) {
        return event_date;
    }

    return date_value.toLocaleDateString('th-TH');
}

function format_input_date(event_date) {
    if (!event_date) {
        return '';
    }

    const date_value = new Date(event_date);

    if (Number.isNaN(date_value.getTime())) {
        return String(event_date).slice(0, 10);
    }

    return date_value.toISOString().slice(0, 10);
}

function format_event_time(event_time) {
    return event_time ? String(event_time).slice(0, 5) : '-';
}

function format_registration_date(registration_date) {
    if (!registration_date) {
        return '-';
    }

    const date_value = new Date(registration_date);

    if (Number.isNaN(date_value.getTime())) {
        return registration_date;
    }

    return date_value.toLocaleString('th-TH');
}

function build_capacity_badge_html(remaining_capacity) {
    if (remaining_capacity <= 0) {
        return '<span class="badge danger">เต็มแล้ว</span>';
    }

    if (remaining_capacity <= 5) {
        return `<span class="badge warning">ใกล้เต็ม! เหลือ ${remaining_capacity}</span>`;
    }

    return '';
}

function build_manage_action_html(event_row) {
    if (!can_manage_event(event_row)) {
        return '';
    }

    return `
        <button class="btn warning" onclick="open_edit_modal(${event_row.event_id})">แก้ไข</button>
        <button class="btn danger" onclick="open_delete_modal(${event_row.event_id})">ลบ</button>
    `;
}

function build_participant_action_html(registration_row) {
    if (!can_cancel_registration(registration_row) || is_cancelled_registration(registration_row)) {
        return '';
    }

    return `
        <div class="participant-actions">
            <button
                type="button"
                class="btn danger participant-action-button"
                onclick="cancel_registration(${Number(registration_row.registration_id)})"
            >
                ยกเลิกการลงทะเบียน
            </button>
        </div>
    `;
}

function build_participant_item_html(registration_row) {
    const participant_name = escape_html(get_registration_full_name(registration_row));
    const gender = escape_html(String(registration_row.gender || '-').trim() || '-');
    const age_number = Number(registration_row.age);
    const age_text = Number.isFinite(age_number) && age_number > 0 ? `${age_number} ปี` : '-';
    const food_allergies = escape_html(String(registration_row.food_allergies || '').trim() || 'ไม่มี');
    const registration_status = escape_html(
        get_registration_status_label(registration_row.registration_status)
    );
    const registration_date = escape_html(format_registration_date(registration_row.registration_date));

    return `
        <li>
            <div class="participant-name">${participant_name}</div>
            <div class="participant-details">
                <span>เพศ: ${gender}</span>
                <span>อายุ: ${age_text}</span>
                <span>อาหารที่แพ้: ${food_allergies}</span>
                <span class="participant-note">สถานะ: ${registration_status} | ลงทะเบียน: ${registration_date}</span>
            </div>
            ${build_participant_action_html(registration_row)}
        </li>
    `;
}

function render_event_list() {
    const event_grid = $('events');

    if (!event_grid) {
        return;
    }

    event_grid.innerHTML = '';

    event_list.forEach((event_row) => {
        const remaining_capacity = event_row.event_capacity - event_row.registration_count;
        const event_is_full = remaining_capacity <= 0;
        const event_card = document.createElement('div');

        event_card.className = 'event-card';
        event_card.innerHTML = `
            ${build_event_image_html(event_row)}
            <div class="content">
                <h3>${escape_html(event_row.event_name)} ${build_capacity_badge_html(remaining_capacity)}</h3>
                <p>${escape_html(event_row.event_description || 'ไม่มีรายละเอียด')}</p>
                <div class="stats">
                    <span>วันที่: ${format_event_date(event_row.event_date)}</span>
                    <span>เวลา: ${format_event_time(event_row.event_time)}</span>
                </div>
                <div class="stats">
                    <span>สถานที่: ${escape_html(event_row.event_location || '-')}</span>
                    <span>รับ ${event_row.event_capacity} คน (ลงทะเบียน ${event_row.registration_count})</span>
                </div>
                <div class="stats">
                    <span>ผู้สร้าง: ${escape_html(event_row.created_by_user_name || '-')}</span>
                </div>
                <div class="action-buttons">
                    <button class="btn primary" onclick="show_register(${event_row.event_id})" ${event_is_full ? 'disabled' : ''}>${event_is_full ? 'เต็มแล้ว' : 'ลงทะเบียน'}</button>
                    <button class="btn secondary" onclick="show_participants(${event_row.event_id})">ดูรายชื่อ</button>
                    ${build_manage_action_html(event_row)}
                </div>
            </div>
        `;

        event_grid.appendChild(event_card);
    });
}

async function fetch_event_list() {
    try {
        const event_response = await axios.get(`${API_BASE_URL}/events`);
        event_list = normalize_event_list(event_response.data);
        render_event_list();
    } catch (request_error) {
        show_request_error(request_error, 'ไม่สามารถโหลดข้อมูลกิจกรรมจากฐานข้อมูลได้');
    }
}

async function create_event(submit_event) {
    submit_event.preventDefault();

    if (!is_logged_in_user()) {
        alert('กรุณาเข้าสู่ระบบก่อนสร้างกิจกรรม');
        return;
    }

    const {
        event_name,
        event_date,
        event_time,
        event_location,
        event_capacity,
        event_description,
        event_image_file
    } = get_event_form_values();
    const event_image_data = event_image_file ? await read_file_as_data_url(event_image_file) : null;

    if (!event_name || Number.isNaN(event_capacity) || event_capacity < 1) {
        alert('กรุณากรอกชื่อกิจกรรมและจำนวนผู้เข้าร่วมให้ถูกต้อง');
        return;
    }

    try {
        await axios.post(`${API_BASE_URL}/events`, {
            user_id: get_current_user_id(),
            event_name,
            event_date,
            event_time,
            event_location,
            event_capacity,
            event_description,
            event_image_data
        });

        submit_event.target.reset();
        set_image_preview($('create-image-preview'), $('create-image-preview-img'), null);
        await fetch_event_list();
        alert('สร้างกิจกรรมสำเร็จและบันทึกลงฐานข้อมูลแล้ว');
    } catch (request_error) {
        show_request_error(request_error, 'ไม่สามารถสร้างกิจกรรมในฐานข้อมูลได้');
    }
}

function show_register(event_id) {
    const event_row = get_event_by_id(event_id);

    if (!event_row) {
        return;
    }

    if (event_row.registration_count >= event_row.event_capacity) {
        alert('กิจกรรมนี้เต็มแล้ว');
        return;
    }

    current_event_id = Number(event_id);

    if ($('register-title')) {
        $('register-title').textContent = `ลงทะเบียน: ${event_row.event_name}`;
    }

    if ($('register-user-hint')) {
        $('register-user-hint').textContent = is_logged_in_user()
            ? `กำลังลงทะเบียนด้วยบัญชี: ${get_current_user_name()}`
            : 'ยังไม่ได้เข้าสู่ระบบ ระบบจะสร้างผู้ใช้แบบผู้เข้าร่วมให้อัตโนมัติจากชื่อที่กรอก';
    }

    fill_registration_form(split_full_name(get_current_user_name()), is_logged_in_user());
    set_element_display('register-section', 'flex');
}

async function submit_registration(submit_event) {
    submit_event.preventDefault();

    const { first_name, last_name, gender, age, food_allergies, participant_name } =
        get_registration_form_values();

    if (!first_name || !last_name) {
        alert('กรุณากรอกชื่อและนามสกุล');
        return;
    }

    if (!gender) {
        alert('กรุณาเลือกเพศ');
        return;
    }

    if (!age || Number(age) <= 0) {
        alert('กรุณากรอกอายุให้ถูกต้อง');
        return;
    }

    try {
        await axios.post(`${API_BASE_URL}/registrations`, {
            event_id: current_event_id,
            user_id: get_current_user_id(),
            participant_name,
            first_name,
            last_name,
            gender,
            age: Number(age),
            food_allergies
        });

        back_to_list();
        await fetch_event_list();
        alert('ลงทะเบียนสำเร็จและบันทึกลงฐานข้อมูลแล้ว');
    } catch (request_error) {
        show_request_error(request_error, 'ไม่สามารถลงทะเบียนได้');
    }
}

async function show_participants(event_id) {
    current_event_id = Number(event_id);

    const event_row = get_event_by_id(event_id);
    const participants_list = $('participants-list');

    if ($('participants-title')) {
        $('participants-title').textContent = `ผู้เข้าร่วม: ${event_row?.event_name || ''}`;
    }

    try {
        const registration_response = await axios.get(`${API_BASE_URL}/events/${current_event_id}/participants`);

        if (participants_list) {
            participants_list.innerHTML = registration_response.data.length > 0
                ? registration_response.data.map(build_participant_item_html).join('')
                : '<li>ยังไม่มีผู้เข้าร่วม</li>';
        }

        set_element_display('participants-section', 'flex');
    } catch (request_error) {
        show_request_error(request_error, 'ไม่สามารถโหลดรายชื่อผู้เข้าร่วมได้');
    }
}

async function cancel_registration(registration_id) {
    if (!get_current_user_id()) {
        alert('กรุณาเข้าสู่ระบบก่อนยกเลิกการลงทะเบียน');
        return;
    }

    if (!await show_confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการลงทะเบียนนี้?')) {
        return;
    }

    try {
        await axios.patch(`${API_BASE_URL}/registrations/${registration_id}/cancel`, {
            user_id: get_current_user_id()
        });

        await fetch_event_list();
        await show_participants(current_event_id);
        alert('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว');
    } catch (request_error) {
        show_request_error(request_error, 'ไม่สามารถยกเลิกการลงทะเบียนได้');
    }
}

function back_to_list() {
    set_element_display('register-section', 'none');
    set_element_display('participants-section', 'none');
    reset_registration_form();
}

async function logout() {
    if (!await show_confirm('แน่ใจหรือไม่ว่าต้องการออกจากระบบ?')) {
        return;
    }

    clear_current_user();
    window.location.reload();
}

function open_edit_modal(event_id) {
    const event_row = get_event_by_id(event_id);

    if (!event_row) {
        alert('ไม่พบกิจกรรมที่ต้องการแก้ไข');
        return;
    }

    if (!can_manage_event(event_row)) {
        alert('เฉพาะเจ้าของกิจกรรมหรือผู้ดูแลระบบเท่านั้นที่แก้ไขได้');
        return;
    }

    if ($('edit_event_id')) $('edit_event_id').value = event_row.event_id;
    if ($('edit_event_name')) $('edit_event_name').value = event_row.event_name;
    if ($('edit_event_date')) $('edit_event_date').value = format_input_date(event_row.event_date);
    if ($('edit_event_time')) $('edit_event_time').value = format_event_time(event_row.event_time);
    if ($('edit_event_location')) $('edit_event_location').value = event_row.event_location || '';
    if ($('edit_event_description')) $('edit_event_description').value = event_row.event_description || '';
    if ($('edit_event_capacity')) $('edit_event_capacity').value = event_row.event_capacity;
    if ($('edit_event_image_file')) $('edit_event_image_file').value = '';
    if ($('remove_event_image')) $('remove_event_image').checked = false;

    set_image_preview(
        $('edit-image-preview'),
        $('edit-image-preview-img'),
        get_image_url(event_row.event_image)
    );

    set_element_display('edit-modal', 'flex');
}

function close_edit_modal() {
    set_element_display('edit-modal', 'none');
}

async function update_event(submit_event) {
    submit_event.preventDefault();

    const event_id = Number(get_input_value('edit_event_id'));
    const existing_event_row = get_event_by_id(event_id);
    const {
        event_name,
        event_date,
        event_time,
        event_location,
        event_capacity,
        event_description,
        event_image_file
    } = get_event_form_values('edit');
    const event_image_data = event_image_file ? await read_file_as_data_url(event_image_file) : null;
    const remove_event_image = $('remove_event_image')?.checked || false;

    if (!existing_event_row || !can_manage_event(existing_event_row)) {
        alert('เฉพาะเจ้าของกิจกรรมหรือผู้ดูแลระบบเท่านั้นที่แก้ไขได้');
        return;
    }

    if (!event_name || !event_date || !event_time || !event_location || Number.isNaN(event_capacity) || event_capacity < 1) {
        alert('กรุณากรอกข้อมูลกิจกรรมให้ครบถ้วน');
        return;
    }

    try {
        await axios.put(`${API_BASE_URL}/events/${event_id}`, {
            user_id: get_current_user_id(),
            event_name,
            event_date,
            event_time,
            event_location,
            event_capacity,
            event_description,
            event_image_data,
            remove_event_image
        });

        close_edit_modal();
        await fetch_event_list();
        alert('อัปเดตกิจกรรมเรียบร้อยแล้ว');
    } catch (request_error) {
        show_request_error(request_error, 'ไม่สามารถอัปเดตกิจกรรมได้');
    }
}

async function open_delete_modal(event_id) {
    const event_row = get_event_by_id(event_id);

    if (!event_row || !can_manage_event(event_row)) {
        alert('เฉพาะเจ้าของกิจกรรมหรือผู้ดูแลระบบเท่านั้นที่ลบได้');
        return;
    }

    if (!await show_confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?')) {
        return;
    }

    try {
        await axios.delete(`${API_BASE_URL}/events/${event_id}`, {
            data: {
                user_id: get_current_user_id()
            }
        });

        await fetch_event_list();
        alert('ลบกิจกรรมเรียบร้อยแล้ว');
    } catch (request_error) {
        show_request_error(request_error, 'ไม่สามารถลบกิจกรรมได้');
    }
}

function bind_image_preview_inputs() {
    const create_image_input = $('event_image_file');
    const edit_image_input = $('edit_event_image_file');
    const remove_event_image = $('remove_event_image');

    if (create_image_input) {
        create_image_input.addEventListener('change', async () => {
            const image_data = create_image_input.files?.[0]
                ? await read_file_as_data_url(create_image_input.files[0])
                : null;

            set_image_preview($('create-image-preview'), $('create-image-preview-img'), image_data);
        });
    }

    if (edit_image_input) {
        edit_image_input.addEventListener('change', async () => {
            const image_data = edit_image_input.files?.[0]
                ? await read_file_as_data_url(edit_image_input.files[0])
                : null;

            set_image_preview($('edit-image-preview'), $('edit-image-preview-img'), image_data);

            if (image_data && remove_event_image) {
                remove_event_image.checked = false;
            }
        });
    }

    if (remove_event_image) {
        remove_event_image.addEventListener('change', () => {
            if (!remove_event_image.checked) {
                return;
            }

            if (edit_image_input) {
                edit_image_input.value = '';
            }

            set_image_preview($('edit-image-preview'), $('edit-image-preview-img'), null);
        });
    }
}

function bind_forms() {
    const event_form = $('event-form');
    const register_form = $('register-form');
    const edit_form = $('edit-form');

    if (event_form) {
        event_form.addEventListener('submit', create_event);
    }

    if (register_form) {
        register_form.addEventListener('submit', submit_registration);
    }

    if (edit_form) {
        edit_form.addEventListener('submit', update_event);
    }
}

async function init_page() {
    setup_login_ui();
    bind_image_preview_inputs();
    bind_forms();
    await fetch_event_list();
}

window.addEventListener('load', init_page);
