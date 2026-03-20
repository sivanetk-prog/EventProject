let event_list = [];
let current_event_id = null;
const $ = (element_id) => document.getElementById(element_id);

function can_manage_event(event_row) {
    if (!event_row) return false;

    return (
        is_admin_user() ||
        Number(event_row.created_by_user_id) === Number(get_current_user_id())
    );
}

function read_file_as_data_url(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        const file_reader = new FileReader();
        file_reader.onload = () => resolve(file_reader.result);
        file_reader.onerror = () => reject(new Error('Cannot read image file'));
        file_reader.readAsDataURL(file);
    });
}

function set_image_preview(preview_container, preview_image, image_source) {
    if (!preview_container || !preview_image) return;

    if (!image_source) {
        preview_container.style.display = 'none';
        preview_image.removeAttribute('src');
        return;
    }

    preview_image.src = image_source;
    preview_container.style.display = 'block';
}

function get_image_url(event_image) {
    if (!event_image) return '';
    if (event_image.startsWith('http://') || event_image.startsWith('https://')) {
        return event_image;
    }

    return `${API_BASE_URL}${event_image}`;
}

function get_input_value(element_id) {
    return $(element_id)?.value || '';
}

function get_trimmed_input_value(element_id) {
    return get_input_value(element_id).trim();
}

function get_number_input_value(element_id) {
    return parseInt(get_input_value(element_id) || '0', 10);
}

function get_input_file(element_id) {
    return $(element_id)?.files?.[0] || null;
}

function get_event_form_values(prefix = '') {
    const field_prefix = prefix ? `${prefix}_` : '';
    const field = (field_name) => `${field_prefix}${field_name}`;

    return {
        event_name: get_trimmed_input_value(field('event_name')),
        event_date: get_input_value(field('event_date')),
        event_time: get_input_value(field('event_time')),
        event_location: get_trimmed_input_value(field('event_location')),
        event_capacity: get_number_input_value(field('event_capacity')),
        event_description: get_trimmed_input_value(field('event_description')),
        event_image_file: get_input_file(field('event_image_file'))
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

function show_request_error(request_error, fallback_message) {
    console.error(request_error);
    alert(get_request_error_message(request_error, fallback_message));
}

window.addEventListener('load', async () => {
    setup_login_ui();
    bind_image_preview_inputs();
    await fetch_event_list();
});

function bind_image_preview_inputs() {
    const create_image_input = $('event_image_file');
    const create_image_preview = $('create-image-preview');
    const create_image_preview_img = $('create-image-preview-img');

    if (create_image_input) {
        create_image_input.addEventListener('change', async () => {
            const image_file = create_image_input.files?.[0] || null;
            const image_data = image_file ? await read_file_as_data_url(image_file) : null;
            set_image_preview(create_image_preview, create_image_preview_img, image_data);
        });
    }

    const edit_image_input = $('edit_event_image_file');
    const edit_image_preview = $('edit-image-preview');
    const edit_image_preview_img = $('edit-image-preview-img');
    const remove_event_image = $('remove_event_image');

    if (edit_image_input) {
        edit_image_input.addEventListener('change', async () => {
            const image_file = edit_image_input.files?.[0] || null;
            const image_data = image_file ? await read_file_as_data_url(image_file) : null;
            set_image_preview(edit_image_preview, edit_image_preview_img, image_data);

            if (image_data && remove_event_image) {
                remove_event_image.checked = false;
            }
        });
    }

    if (remove_event_image) {
        remove_event_image.addEventListener('change', () => {
            if (remove_event_image.checked) {
                if (edit_image_input) {
                    edit_image_input.value = '';
                }

                set_image_preview(edit_image_preview, edit_image_preview_img, null);
            }
        });
    }
}

function setup_login_ui() {
    const create_event_section = $('create-event');
    const create_event_link = $('create-event-link');
    const login_link = $('login-link');
    const user_greeting = $('user-greeting');
    const logout_btn = $('logout-btn');

    if (create_event_section) {
        create_event_section.style.display = is_logged_in_user() ? 'block' : 'none';
    }

    if (create_event_link) {
        create_event_link.style.display = is_logged_in_user() ? 'inline-flex' : 'none';
    }

    if (!is_logged_in_user()) {
        if (login_link) login_link.style.display = 'inline-flex';
        if (user_greeting) user_greeting.style.display = 'none';
        if (logout_btn) logout_btn.style.display = 'none';
        return;
    }

    const current_user_name = get_current_user_name();
    const current_user_role = get_current_user_role();

    if (login_link) login_link.style.display = 'none';
    if (user_greeting) {
        user_greeting.textContent = `สวัสดี, ${current_user_name} (${current_user_role})`;
        user_greeting.style.display = 'inline';
    }
    if (logout_btn) logout_btn.style.display = 'inline-flex';
}

function normalize_event_list(event_rows) {
    return event_rows.map((event_row) => ({
        event_id: event_row.event_id,
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
    if (!event_date) return '-';

    const date_value = new Date(event_date);
    if (Number.isNaN(date_value.getTime())) {
        return event_date;
    }

    return date_value.toLocaleDateString('th-TH');
}

function format_input_date(event_date) {
    if (!event_date) return '';

    const date_value = new Date(event_date);
    if (Number.isNaN(date_value.getTime())) {
        return String(event_date).slice(0, 10);
    }

    return date_value.toISOString().slice(0, 10);
}

function format_event_time(event_time) {
    if (!event_time) return '-';
    return String(event_time).slice(0, 5);
}

function format_registration_date(registration_date) {
    if (!registration_date) return '-';

    const date_value = new Date(registration_date);
    if (Number.isNaN(date_value.getTime())) {
        return registration_date;
    }

    return date_value.toLocaleString('th-TH');
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

function get_registration_full_name(registration_row) {
    const full_name = [
        String(registration_row?.first_name || '').trim(),
        String(registration_row?.last_name || '').trim()
    ]
        .filter(Boolean)
        .join(' ');

    return full_name || String(registration_row?.user_name || '').trim() || '-';
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

async function fetch_event_list() {
    try {
        const event_response = await axios.get(`${API_BASE_URL}/events`);
        event_list = normalize_event_list(event_response.data);
        render_event_list();
    } catch (request_error) {
        console.error(request_error);
        alert('ไม่สามารถโหลดข้อมูลกิจกรรมจากฐานข้อมูลได้');
    }
}

function render_event_list() {
    const event_grid = $('events');
    if (!event_grid) return;

    event_grid.innerHTML = '';

    event_list.forEach((event_row) => {
        const event_card = document.createElement('div');
        event_card.className = 'event-card';

        const event_image_url = get_image_url(event_row.event_image);
        const event_image_html = event_image_url
            ? `<img class="event-image" src="${event_image_url}" alt="${event_row.event_name}">`
            : '<div class="no-image">ไม่มีรูปภาพ</div>';

        const remaining_capacity = event_row.event_capacity - event_row.registration_count;
        const event_is_full = remaining_capacity <= 0;

        let capacity_badge_html = '';
        if (remaining_capacity <= 5 && remaining_capacity > 0) {
            capacity_badge_html = `<span class="badge warning">ใกล้เต็ม! เหลือ ${remaining_capacity}</span>`;
        } else if (remaining_capacity <= 0) {
            capacity_badge_html = '<span class="badge danger">เต็มแล้ว</span>';
        }

        const manage_action_html = can_manage_event(event_row)
            ? `
                    <button class="btn warning" onclick="open_edit_modal(${event_row.event_id})">แก้ไข</button>
                    <button class="btn danger" onclick="open_delete_modal(${event_row.event_id})">ลบ</button>
                `
            : '';

        event_card.innerHTML = `
            ${event_image_html}
            <div class="content">
                <h3>${event_row.event_name} ${capacity_badge_html}</h3>
                <p>${event_row.event_description || 'ไม่มีรายละเอียด'}</p>
                <div class="stats">
                    <span>วันที่: ${format_event_date(event_row.event_date)}</span>
                    <span>เวลา: ${format_event_time(event_row.event_time)}</span>
                </div>
                <div class="stats">
                    <span>สถานที่: ${event_row.event_location || '-'}</span>
                    <span>รับ ${event_row.event_capacity} คน (ลงทะเบียน ${event_row.registration_count})</span>
                </div>
                <div class="stats">
                    <span>ผู้สร้าง: ${event_row.created_by_user_name || '-'}</span>
                </div>
                <div class="action-buttons">
                    <button class="btn primary" onclick="show_register(${event_row.event_id})" ${event_is_full ? 'disabled' : ''}>${event_is_full ? 'เต็มแล้ว' : 'ลงทะเบียน'}</button>
                    <button class="btn secondary" onclick="show_participants(${event_row.event_id})">ดูรายชื่อ</button>
                    ${manage_action_html}
                </div>
            </div>
        `;

        event_grid.appendChild(event_card);
    });
}

const event_form = $('event-form');
if (event_form) {
    event_form.addEventListener('submit', async (submit_event) => {
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
            set_image_preview(
                $('create-image-preview'),
                $('create-image-preview-img'),
                null
            );
            await fetch_event_list();
            alert('สร้างกิจกรรมสำเร็จและบันทึกลงฐานข้อมูลแล้ว');
        } catch (request_error) {
            show_request_error(request_error, 'ไม่สามารถสร้างกิจกรรมในฐานข้อมูลได้');
        }
    });
}

function show_register(event_id) {
    current_event_id = Number(event_id);
    const event_row = event_list.find((item) => Number(item.event_id) === current_event_id);
    if (!event_row) return;

    if (event_row.registration_count >= event_row.event_capacity) {
        alert('กิจกรรมนี้เต็มแล้ว');
        return;
    }

    const register_title = $('register-title');
    const register_section = $('register-section');
    const register_user_hint = $('register-user-hint');
    const first_name_input = $('first_name');
    const last_name_input = $('last_name');
    const gender_input = $('gender');
    const age_input = $('age');
    const food_allergies_input = $('food_allergies');
    const logged_in = is_logged_in_user();
    const current_user_name = get_current_user_name();
    const name_parts = split_full_name(current_user_name);

    if (register_title) {
        register_title.textContent = `ลงทะเบียน: ${event_row.event_name}`;
    }

    if (register_user_hint) {
        register_user_hint.textContent = logged_in
            ? `กำลังลงทะเบียนด้วยบัญชี: ${current_user_name}`
            : 'ยังไม่ได้เข้าสู่ระบบ ระบบจะสร้างผู้ใช้แบบ participant ให้อัตโนมัติจากชื่อที่กรอก';
    }

    if (first_name_input) first_name_input.value = logged_in ? name_parts.first_name : '';
    if (last_name_input) last_name_input.value = logged_in ? name_parts.last_name : '';
    if (gender_input) gender_input.value = '';
    if (age_input) age_input.value = '';
    if (food_allergies_input) food_allergies_input.value = '';

    if (register_section) {
        register_section.style.display = 'flex';
    }
}

const register_form = $('register-form');
if (register_form) {
    register_form.addEventListener('submit', async (submit_event) => {
        submit_event.preventDefault();

        const { first_name, last_name, gender, age, food_allergies, participant_name } =
            get_registration_form_values();
        const current_user_id = get_current_user_id();

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
                user_id: current_user_id,
                participant_name,
                first_name,
                last_name,
                gender,
                age: Number(age),
                food_allergies
            });

            submit_event.target.reset();
            back_to_list();
            await fetch_event_list();
            alert('ลงทะเบียนสำเร็จและบันทึกลงฐานข้อมูลแล้ว');
        } catch (request_error) {
            show_request_error(request_error, 'ไม่สามารถลงทะเบียนได้');
        }
    });
}

async function show_participants(event_id) {
    current_event_id = Number(event_id);

    const participants_title = $('participants-title');
    const participants_list = $('participants-list');
    const participants_section = $('participants-section');

    if (participants_title) {
        const event_row = event_list.find((item) => Number(item.event_id) === current_event_id);
        participants_title.textContent = `ผู้เข้าร่วม: ${event_row?.event_name || ''}`;
    }

    try {
        const registration_response = await axios.get(
            `${API_BASE_URL}/events/${current_event_id}/participants`
        );

        if (participants_list) {
            participants_list.innerHTML = registration_response.data.length
                ? registration_response.data
                    .map((registration_row) => {
                        const participant_name = escape_html(get_registration_full_name(registration_row));
                        const gender = escape_html(String(registration_row.gender || '-').trim() || '-');
                        const age_number = Number(registration_row.age);
                        const age_text = Number.isFinite(age_number) && age_number > 0 ? `${age_number} ปี` : '-';
                        const food_allergies = escape_html(String(registration_row.food_allergies || '').trim() || 'ไม่มี');
                        const registration_status = escape_html(String(registration_row.registration_status || '-').trim() || '-');
                        const registration_date = escape_html(format_registration_date(registration_row.registration_date));
                        const action_html =
                            can_cancel_registration(registration_row) && !is_cancelled_registration(registration_row)
                                ? `
                                    <div class="participant-actions">
                                        <button
                                            type="button"
                                            class="btn danger participant-action-button"
                                            onclick="cancel_registration(${Number(registration_row.registration_id)})"
                                        >
                                            ยกเลิกการลงทะเบียน
                                        </button>
                                    </div>
                                `
                                : '';

                        return `
                            <li>
                                <div class="participant-name">${participant_name}</div>
                                <div class="participant-details">
                                    <span>เพศ: ${gender}</span>
                                    <span>อายุ: ${age_text}</span>
                                    <span>อาหารที่แพ้: ${food_allergies}</span>
                                    <span class="participant-note">สถานะ: ${registration_status} | ลงทะเบียน: ${registration_date}</span>
                                </div>
                                ${action_html}
                            </li>
                        `;
                    })
                    .join('')
                : '<li>ยังไม่มีผู้เข้าร่วม</li>';
        }

        if (participants_section) {
            participants_section.style.display = 'flex';
        }
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
    const register_section = $('register-section');
    const participants_section = $('participants-section');
    const register_form_element = $('register-form');

    if (register_section) register_section.style.display = 'none';
    if (participants_section) participants_section.style.display = 'none';
    if (register_form_element) register_form_element.reset();
}

async function logout() {
    if (await show_confirm('แน่ใจหรือไม่ว่าต้องการออกจากระบบ?')) {
        clear_current_user();
        window.location.reload();
    }
}

function open_edit_modal(event_id) {
    const event_row = event_list.find((item) => Number(item.event_id) === Number(event_id));

    if (!event_row) {
        alert('ไม่พบกิจกรรมที่ต้องการแก้ไข');
        return;
    }

    if (!can_manage_event(event_row)) {
        alert('เฉพาะเจ้าของกิจกรรมหรือ admin เท่านั้นที่แก้ไขได้');
        return;
    }

    $('edit_event_id').value = event_row.event_id;
    $('edit_event_name').value = event_row.event_name;
    $('edit_event_date').value = format_input_date(event_row.event_date);
    $('edit_event_time').value = format_event_time(event_row.event_time);
    $('edit_event_location').value = event_row.event_location || '';
    $('edit_event_description').value = event_row.event_description || '';
    $('edit_event_capacity').value = event_row.event_capacity;
    $('edit_event_image_file').value = '';
    $('remove_event_image').checked = false;

    set_image_preview(
        $('edit-image-preview'),
        $('edit-image-preview-img'),
        get_image_url(event_row.event_image)
    );

    $('edit-modal').style.display = 'flex';
}

function close_edit_modal() {
    const edit_modal = $('edit-modal');
    if (edit_modal) {
        edit_modal.style.display = 'none';
    }
}

const edit_form = $('edit-form');
if (edit_form) {
    edit_form.addEventListener('submit', async (submit_event) => {
        submit_event.preventDefault();

        const event_id = Number(get_input_value('edit_event_id'));
        const existing_event_row = event_list.find((item) => Number(item.event_id) === event_id);
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
        const remove_event_image = $('remove_event_image').checked;

        if (!existing_event_row || !can_manage_event(existing_event_row)) {
            alert('เฉพาะเจ้าของกิจกรรมหรือ admin เท่านั้นที่แก้ไขได้');
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
    });
}

async function open_delete_modal(event_id) {
    const event_row = event_list.find((item) => Number(item.event_id) === Number(event_id));
    if (!event_row || !can_manage_event(event_row)) {
        alert('เฉพาะเจ้าของกิจกรรมหรือ admin เท่านั้นที่ลบได้');
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
