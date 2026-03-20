const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const server_port = Number(process.env.PORT) || 3070;
const uploads_directory = path.join(__dirname, 'uploads');

fs.mkdirSync(uploads_directory, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploads_directory));

const database_config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'event_management',
  port: Number(process.env.DB_PORT) || 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const database_pool = mysql.createPool(database_config);
const database = database_pool.promise();

const default_admin_user = {
  user_name: process.env.ADMIN_NAME || 'admin',
  user_email: process.env.ADMIN_EMAIL || 'admin@eventhub.local',
  user_password: process.env.ADMIN_PASSWORD || 'admin1234',
  user_role: 'admin'
};

const REGISTRATION_STATUS_PENDING = 'รอดำเนินการ';
const REGISTRATION_STATUS_CANCELLED = 'ยกเลิกการลงทะเบียน';
const DEFAULT_GUEST_PASSWORD = 'guest1234';

function create_http_error(status_code, message) {
  const error = new Error(message);
  error.status_code = status_code;
  return error;
}

function send_error_response(response, error) {
  response.status(error.status_code || 500).json({
    message: error.message,
    error: error.message
  });
}

function is_duplicate_entry_error(error) {
  return error?.code === 'ER_DUP_ENTRY';
}

function normalize_text(value) {
  return String(value || '').trim();
}

function normalize_optional_text(value) {
  const normalized_value = normalize_text(value);
  return normalized_value || null;
}

function normalize_positive_number(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const normalized_number = Number(value);
  return Number.isFinite(normalized_number) ? normalized_number : Number.NaN;
}

function is_cancelled_registration_status(status) {
  return normalize_text(status).toLowerCase() === REGISTRATION_STATUS_CANCELLED;
}

async function query_first_row(query_text, query_values = []) {
  const [row_list] = await database.query(query_text, query_values);
  return row_list[0] || null;
}

function async_handler(route_handler) {
  return async (request, response) => {
    try {
      await route_handler(request, response);
    } catch (error) {
      send_error_response(response, error);
    }
  };
}

// Generic data helpers used by several routes.
function build_guest_user_email(participant_name) {
  const email_name = String(participant_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest';

  let name_hash = 0;
  for (const character of participant_name) {
    name_hash = (name_hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `${email_name}-${name_hash}@eventhub.local`;
}

function build_participant_full_name(first_name, last_name) {
  return [first_name, last_name]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

function delete_event_image_file(event_image) {
  if (!event_image || !String(event_image).startsWith('/uploads/')) {
    return;
  }

  const image_file_name = path.basename(event_image);
  const image_path = path.join(uploads_directory, image_file_name);
  if (fs.existsSync(image_path)) {
    fs.unlinkSync(image_path);
  }
}

function resolve_public_event_image(event_image) {
  if (!event_image) {
    return null;
  }

  const normalized_event_image = String(event_image).trim();
  if (!normalized_event_image) {
    return null;
  }

  if (!normalized_event_image.startsWith('/uploads/')) {
    return normalized_event_image;
  }

  const image_file_name = path.basename(normalized_event_image);
  const image_path = path.join(uploads_directory, image_file_name);
  return fs.existsSync(image_path) ? normalized_event_image : null;
}

function map_rows_with_public_event_image(row_list) {
  return row_list.map((row) => ({
    ...row,
    event_image: resolve_public_event_image(row.event_image)
  }));
}

function save_event_image(event_image_data) {
  if (!event_image_data) {
    return null;
  }

  const image_match = String(event_image_data).match(
    /^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/i
  );

  if (!image_match) {
    throw create_http_error(400, 'รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
  }

  const image_extension = image_match[1].toLowerCase() === 'jpeg' ? 'jpg' : image_match[1].toLowerCase();
  const image_buffer = Buffer.from(image_match[2], 'base64');
  const file_name = `event-${Date.now()}-${Math.round(Math.random() * 1e9)}.${image_extension}`;
  const file_path = path.join(uploads_directory, file_name);

  fs.writeFileSync(file_path, image_buffer);
  return `/uploads/${file_name}`;
}

async function test_database_connection() {
  const database_connection = await database.getConnection();

  try {
    await database_connection.ping();
    console.log(
      `Connected to MySQL at ${database_config.host}:${database_config.port}/${database_config.database}`
    );
  } finally {
    database_connection.release();
  }
}

async function ensure_table_column(table_name, column_name, sql_type, after_column) {
  const [column_rows] = await database.query(
    `
      SELECT COUNT(*) AS column_count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [database_config.database, table_name, column_name]
  );

  if (Number(column_rows[0].column_count) > 0) {
    return;
  }

  await database.query(
    `
      ALTER TABLE ${table_name}
      ADD COLUMN ${column_name} ${sql_type}
      AFTER ${after_column}
    `
  );
}

async function ensure_event_image_column() {
  await ensure_table_column('EVENTS', 'event_image', 'VARCHAR(255) NULL', 'event_description');
}

async function ensure_event_owner_column() {
  await ensure_table_column('EVENTS', 'created_by_user_id', 'INT NULL', 'event_image');
}

async function ensure_registration_profile_columns() {
  const required_columns = [
    { column_name: 'first_name', sql_type: 'VARCHAR(100) NULL', after_column: 'user_id' },
    { column_name: 'last_name', sql_type: 'VARCHAR(100) NULL', after_column: 'first_name' },
    { column_name: 'gender', sql_type: 'VARCHAR(20) NULL', after_column: 'last_name' },
    { column_name: 'age', sql_type: 'INT NULL', after_column: 'gender' },
    { column_name: 'food_allergies', sql_type: 'TEXT NULL', after_column: 'age' }
  ];

  for (const column_row of required_columns) {
    await ensure_table_column(
      'registrations',
      column_row.column_name,
      column_row.sql_type,
      column_row.after_column
    );
  }
}

// Database lookup helpers keep route handlers smaller and easier to read.
async function get_user_by_id(user_id) {
  return query_first_row(
    `
      SELECT user_id, user_name, user_email, user_phone, user_role, created_at, updated_at
      FROM users
      WHERE user_id = ?
      LIMIT 1
    `,
    [user_id]
  );
}

async function require_admin_user(user_id) {
  if (!user_id) {
    throw create_http_error(401, 'กรุณาระบุ user_id ของผู้ดูแลระบบ');
  }

  const user_row = await get_user_by_id(user_id);
  if (!user_row) {
    throw create_http_error(404, 'ไม่พบผู้ใช้');
  }

  if (user_row.user_role !== 'admin') {
    throw create_http_error(403, 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการกิจกรรมได้');
  }

  return user_row;
}

async function require_authenticated_user(user_id) {
  if (!user_id) {
    throw create_http_error(401, 'กรุณาระบุ user_id');
  }

  const user_row = await get_user_by_id(user_id);
  if (!user_row) {
    throw create_http_error(404, 'ไม่พบผู้ใช้');
  }

  return user_row;
}

async function get_event_by_id(event_id) {
  return query_first_row(
    `
      SELECT
        event_id,
        event_name,
        event_date,
        event_time,
        event_location,
        event_capacity,
        event_description,
        event_image,
        created_by_user_id,
        created_at,
        updated_at
      FROM EVENTS
      WHERE event_id = ?
      LIMIT 1
    `,
    [event_id]
  );
}

async function require_event_owner(event_id, user_id) {
  const user_row = await require_authenticated_user(user_id);
  const event_row = await get_event_by_id(event_id);

  if (!event_row) {
    throw create_http_error(404, 'ไม่พบกิจกรรม');
  }

  if (
    user_row.user_role !== 'admin' &&
    Number(event_row.created_by_user_id) !== Number(user_row.user_id)
  ) {
    throw create_http_error(403, 'เฉพาะผู้สร้างกิจกรรมหรือผู้ดูแลระบบเท่านั้นที่แก้ไขหรือลบกิจกรรมนี้ได้');
  }

  return { user_row, event_row };
}

async function get_registration_by_id(registration_id) {
  return query_first_row(
    `
      SELECT
        registration_id,
        event_id,
        user_id,
        registration_status,
        created_at,
        updated_at
      FROM registrations
      WHERE registration_id = ?
      LIMIT 1
    `,
    [registration_id]
  );
}

async function get_existing_registration(event_id, user_id) {
  return query_first_row(
    `
      SELECT registration_id, registration_status
      FROM registrations
      WHERE event_id = ? AND user_id = ?
      ORDER BY registration_id DESC
      LIMIT 1
    `,
    [event_id, user_id]
  );
}

async function get_event_registration_summary(event_id) {
  return query_first_row(
    `
      SELECT
        e.event_id,
        e.event_capacity,
        COALESCE(SUM(
          CASE
            WHEN r.registration_id IS NOT NULL AND r.registration_status <> ? THEN 1
            ELSE 0
          END
        ), 0) AS registration_count
      FROM EVENTS e
      LEFT JOIN registrations r ON r.event_id = e.event_id
      WHERE e.event_id = ?
      GROUP BY e.event_id, e.event_capacity
      LIMIT 1
    `,
    [REGISTRATION_STATUS_CANCELLED, event_id]
  );
}

async function require_registration_access(registration_id, user_id) {
  const user_row = await require_authenticated_user(user_id);
  const registration_row = await get_registration_by_id(registration_id);

  if (!registration_row) {
    throw create_http_error(404, 'ไม่พบข้อมูลการลงทะเบียน');
  }

  if (
    user_row.user_role !== 'admin' &&
    Number(registration_row.user_id) !== Number(user_row.user_id)
  ) {
    throw create_http_error(403, 'เฉพาะเจ้าของการลงทะเบียนหรือผู้ดูแลระบบเท่านั้นที่ยกเลิกรายการนี้ได้');
  }

  return { user_row, registration_row };
}

async function get_or_create_user_id(participant_name) {
  const user_email = build_guest_user_email(participant_name);

  const existing_user_row = await query_first_row(
    'SELECT user_id FROM users WHERE user_email = ? LIMIT 1',
    [user_email]
  );

  if (existing_user_row) {
    return existing_user_row.user_id;
  }

  const [insert_user_result] = await database.query(
    `
      INSERT INTO users (user_name, user_email, user_phone, user_password, user_role)
      VALUES (?, ?, NULL, ?, 'participant')
    `,
    [participant_name, user_email, DEFAULT_GUEST_PASSWORD]
  );

  return insert_user_result.insertId;
}

async function ensure_default_admin_user() {
  const existing_admin_row = await query_first_row(
    `
      SELECT user_id
      FROM users
      WHERE user_email = ?
      LIMIT 1
    `,
    [default_admin_user.user_email]
  );

  if (existing_admin_row) {
    await database.query(
      `
        UPDATE users
        SET user_role = 'admin'
        WHERE user_id = ?
      `,
      [existing_admin_row.user_id]
    );

    return existing_admin_row.user_id;
  }

  const [insert_admin_result] = await database.query(
    `
      INSERT INTO users (user_name, user_email, user_phone, user_password, user_role)
      VALUES (?, ?, NULL, ?, ?)
    `,
    [
      default_admin_user.user_name,
      default_admin_user.user_email,
      default_admin_user.user_password,
      default_admin_user.user_role
    ]
  );

  return insert_admin_result.insertId;
}

function normalize_registration_payload(registration_payload) {
  const normalized_first_name = normalize_text(registration_payload.first_name);
  const normalized_last_name = normalize_text(registration_payload.last_name);
  const normalized_gender = normalize_text(registration_payload.gender);
  const normalized_food_allergies = normalize_optional_text(registration_payload.food_allergies);
  const normalized_age = normalize_positive_number(registration_payload.age);
  const registration_full_name =
    build_participant_full_name(normalized_first_name, normalized_last_name) ||
    normalize_text(registration_payload.participant_name);

  return {
    normalized_first_name,
    normalized_last_name,
    normalized_gender,
    normalized_food_allergies,
    normalized_age,
    registration_full_name
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/health', async_handler(async (request, response) => {
  await database.query('SELECT 1');
  response.json({ ok: true, database_status: 'connected' });
}));

app.post('/users/register', async (request, response) => {
  const { user_name, user_email, user_phone, user_password } = request.body;

  if (!user_name || !user_email || !user_password) {
    return response.status(400).json({
      message: 'กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่านให้ครบ'
    });
  }

  try {
    const [insert_user_result] = await database.query(
      `
        INSERT INTO users (user_name, user_email, user_phone, user_password, user_role)
        VALUES (?, ?, ?, ?, 'participant')
      `,
      [user_name, user_email, user_phone || null, user_password]
    );

    const user_row = await get_user_by_id(insert_user_result.insertId);

    response.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      user_row
    });
  } catch (error) {
    if (is_duplicate_entry_error(error)) {
      return response.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    send_error_response(response, error);
  }
});

app.post('/auth/login', async_handler(async (request, response) => {
  const { user_email, user_password } = request.body;

  if (!user_email || !user_password) {
    return response.status(400).json({
      message: 'กรุณากรอกอีเมลและรหัสผ่าน'
    });
  }

  const user_row = await query_first_row(
    `
      SELECT user_id, user_name, user_email, user_phone, user_role, created_at, updated_at
      FROM users
      WHERE user_email = ? AND user_password = ?
      LIMIT 1
    `,
    [user_email, user_password]
  );

  if (!user_row) {
    throw create_http_error(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }

  response.json({
    message: 'เข้าสู่ระบบสำเร็จ',
    user_row
  });
}));

app.get('/users', async_handler(async (request, response) => {
  const user_id = Number(request.query.user_id || 0);

  await require_admin_user(user_id);

  const [user_rows] = await database.query(
    `
      SELECT user_id, user_name, user_email, user_phone, user_role, created_at, updated_at
      FROM users
      ORDER BY user_id DESC
    `
  );

  response.json(user_rows);
}));

app.get('/registrations', async_handler(async (request, response) => {
  const user_id = Number(request.query.user_id || 0);

  await require_admin_user(user_id);

  const [registration_rows] = await database.query(
    `
      SELECT
        r.registration_id,
        r.event_id,
        r.user_id,
        r.first_name,
        r.last_name,
        r.gender,
        r.age,
        r.food_allergies,
        r.registration_date,
        r.registration_status,
        r.created_at,
        r.updated_at,
        e.event_name,
        u.user_name,
        u.user_email,
        u.user_role
      FROM registrations r
      JOIN EVENTS e ON r.event_id = e.event_id
      JOIN users u ON r.user_id = u.user_id
      ORDER BY r.registration_id DESC
    `
  );

  response.json(registration_rows);
}));

app.get('/events', async_handler(async (request, response) => {
  const [event_rows] = await database.query(
    `
      SELECT
        e.event_id,
        e.event_name,
        e.event_date,
        e.event_time,
        e.event_location,
        e.event_capacity,
        e.event_description,
        e.event_image,
        e.created_by_user_id,
        e.created_at,
        e.updated_at,
        creator.user_name AS created_by_user_name,
        COALESCE(SUM(
          CASE
            WHEN r.registration_id IS NOT NULL AND r.registration_status <> ? THEN 1
            ELSE 0
          END
        ), 0) AS registration_count
      FROM EVENTS e
      LEFT JOIN users creator ON creator.user_id = e.created_by_user_id
      LEFT JOIN registrations r ON r.event_id = e.event_id
      GROUP BY
        e.event_id,
        e.event_name,
        e.event_date,
        e.event_time,
        e.event_location,
        e.event_capacity,
        e.event_description,
        e.event_image,
        e.created_by_user_id,
        e.created_at,
        e.updated_at,
        creator.user_name
      ORDER BY e.event_id DESC
    `,
    [REGISTRATION_STATUS_CANCELLED]
  );

  response.json(map_rows_with_public_event_image(event_rows));
}));

app.post('/events', async_handler(async (request, response) => {
  const {
    user_id,
    event_name,
    event_date,
    event_time,
    event_location,
    event_capacity,
    event_description,
    event_image_data
  } = request.body;

  if (!event_name || !event_date || !event_time || !event_location || !event_capacity) {
    return response.status(400).json({
      message: 'กรุณากรอกชื่อกิจกรรม วันที่ เวลา สถานที่ และจำนวนที่รับให้ครบ'
    });
  }

  const user_row = await require_authenticated_user(user_id);
  const event_image = event_image_data ? save_event_image(event_image_data) : null;

  const [insert_event_result] = await database.query(
    `
      INSERT INTO EVENTS (
        event_name,
        event_date,
        event_time,
        event_location,
        event_capacity,
        event_description,
        event_image,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      event_name,
      event_date,
      event_time,
      event_location,
      event_capacity,
      event_description || null,
      event_image,
      user_row.user_id
    ]
  );

  response.status(201).json({
    message: 'สร้างกิจกรรมสำเร็จ',
    event_id: insert_event_result.insertId,
    event_image,
    created_by_user_id: user_row.user_id
  });
}));

app.put('/events/:event_id', async_handler(async (request, response) => {
  const { event_id } = request.params;
  const {
    user_id,
    event_name,
    event_date,
    event_time,
    event_location,
    event_capacity,
    event_description,
    event_image_data,
    remove_event_image
  } = request.body;

  const { event_row: existing_event_row } = await require_event_owner(event_id, user_id);

  let event_image = existing_event_row.event_image;

  if (remove_event_image) {
    delete_event_image_file(existing_event_row.event_image);
    event_image = null;
  }

  if (event_image_data) {
    delete_event_image_file(existing_event_row.event_image);
    event_image = save_event_image(event_image_data);
  }

  await database.query(
    `
      UPDATE EVENTS
      SET
        event_name = ?,
        event_date = ?,
        event_time = ?,
        event_location = ?,
        event_capacity = ?,
        event_description = ?,
        event_image = ?
      WHERE event_id = ?
    `,
    [
      event_name || existing_event_row.event_name,
      event_date || existing_event_row.event_date,
      event_time || existing_event_row.event_time,
      event_location || existing_event_row.event_location,
      event_capacity || existing_event_row.event_capacity,
      event_description ?? existing_event_row.event_description,
      event_image,
      event_id
    ]
  );

  response.json({ message: 'อัปเดตกิจกรรมสำเร็จ', event_image });
}));

app.delete('/events/:event_id', async_handler(async (request, response) => {
  const { event_id } = request.params;
  const { user_id } = request.body;

  const { event_row: existing_event_row } = await require_event_owner(event_id, user_id);

  await database.query('DELETE FROM registrations WHERE event_id = ?', [event_id]);
  await database.query('DELETE FROM EVENTS WHERE event_id = ?', [event_id]);
  delete_event_image_file(existing_event_row.event_image);

  response.json({ message: 'ลบกิจกรรมสำเร็จ' });
}));

app.post('/registrations', async (request, response) => {
  const { event_id, user_id } = request.body;

  try {
    const {
      normalized_first_name,
      normalized_last_name,
      normalized_gender,
      normalized_food_allergies,
      normalized_age,
      registration_full_name
    } = normalize_registration_payload(request.body);

    if (!normalized_first_name || !normalized_last_name || !normalized_gender) {
      throw create_http_error(400, 'กรุณากรอกชื่อ นามสกุล และเพศให้ครบ');
    }

    if (normalized_age === null || Number.isNaN(normalized_age) || normalized_age <= 0) {
      throw create_http_error(400, 'กรุณากรอกอายุเป็นตัวเลขมากกว่า 0');
    }

    const event_row = await get_event_registration_summary(event_id);

    if (!event_row) {
      throw create_http_error(404, 'ไม่พบกิจกรรม');
    }

    if (Number(event_row.registration_count) >= Number(event_row.event_capacity)) {
      throw create_http_error(400, 'กิจกรรมนี้เต็มแล้ว');
    }

    const registration_user_id =
      user_id || (registration_full_name ? await get_or_create_user_id(registration_full_name) : null);

    if (!registration_user_id) {
      throw create_http_error(400, 'กรุณาระบุ user_id หรือข้อมูลผู้ลงทะเบียน');
    }

    const existing_registration_row = await get_existing_registration(event_id, registration_user_id);

    if (existing_registration_row) {
      if (!is_cancelled_registration_status(existing_registration_row.registration_status)) {
        throw create_http_error(400, 'ผู้ใช้นี้ลงทะเบียนกิจกรรมนี้แล้ว');
      }

      await database.query(
        `
          UPDATE registrations
          SET
            first_name = ?,
            last_name = ?,
            gender = ?,
            age = ?,
            food_allergies = ?,
            registration_status = ?,
            registration_date = NOW()
          WHERE registration_id = ?
        `,
        [
          normalized_first_name,
          normalized_last_name,
          normalized_gender,
          normalized_age,
          normalized_food_allergies,
          REGISTRATION_STATUS_PENDING,
          existing_registration_row.registration_id
        ]
      );

      return response.json({
        message: 'ลงทะเบียนสำเร็จ',
        registration_id: existing_registration_row.registration_id,
        user_id: registration_user_id
      });
    }

    const [insert_registration_result] = await database.query(
      `
        INSERT INTO registrations (
          event_id,
          user_id,
          first_name,
          last_name,
          gender,
          age,
          food_allergies
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        event_id,
        registration_user_id,
        normalized_first_name,
        normalized_last_name,
        normalized_gender,
        normalized_age,
        normalized_food_allergies
      ]
    );

    response.status(201).json({
      message: 'ลงทะเบียนสำเร็จ',
      registration_id: insert_registration_result.insertId,
      user_id: registration_user_id
    });
  } catch (error) {
    if (is_duplicate_entry_error(error)) {
      return response.status(400).json({
        message: 'ผู้ใช้นี้ลงทะเบียนกิจกรรมนี้แล้ว'
      });
    }

    send_error_response(response, error);
  }
});

app.patch('/registrations/:registration_id/cancel', async_handler(async (request, response) => {
  const { registration_id } = request.params;
  const { user_id } = request.body;

  const { registration_row } = await require_registration_access(registration_id, user_id);

  if (is_cancelled_registration_status(registration_row.registration_status)) {
    return response.json({
      message: 'รายการนี้ถูกยกเลิกไปแล้ว',
      registration_id: registration_row.registration_id
    });
  }

  await database.query(
    `
      UPDATE registrations
      SET registration_status = ?
      WHERE registration_id = ?
    `,
    [REGISTRATION_STATUS_CANCELLED, registration_id]
  );

  response.json({
    message: 'ยกเลิกการลงทะเบียนสำเร็จ',
    registration_id: Number(registration_id)
  });
}));

app.get('/events/:event_id/participants', async_handler(async (request, response) => {
  const { event_id } = request.params;

  const [registration_rows] = await database.query(
    `
      SELECT
        r.registration_id,
        r.event_id,
        r.user_id,
        r.first_name,
        r.last_name,
        r.gender,
        r.age,
        r.food_allergies,
        r.registration_date,
        r.registration_status,
        r.created_at,
        r.updated_at,
        u.user_name,
        u.user_email,
        u.user_phone,
        u.user_role
      FROM registrations r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.event_id = ?
      ORDER BY r.registration_id DESC
    `,
    [event_id]
  );

  response.json(registration_rows);
}));

app.get('/users/:user_id/registrations', async_handler(async (request, response) => {
  const { user_id } = request.params;

  const [registration_rows] = await database.query(
    `
      SELECT
        r.registration_id,
        r.event_id,
        r.user_id,
        r.first_name,
        r.last_name,
        r.gender,
        r.age,
        r.food_allergies,
        r.registration_date,
        r.registration_status,
        e.event_name,
        e.event_date,
        e.event_time,
        e.event_location,
        e.event_image
      FROM registrations r
      JOIN EVENTS e ON r.event_id = e.event_id
      WHERE r.user_id = ?
      ORDER BY r.registration_id DESC
    `,
    [user_id]
  );

  response.json(map_rows_with_public_event_image(registration_rows));
}));

// Keep startup work together so the boot flow is easy to follow.
async function start_server() {
  try {
    await test_database_connection();
    await ensure_event_image_column();
    await ensure_event_owner_column();
    await ensure_registration_profile_columns();
    const admin_user_id = await ensure_default_admin_user();
    await database.query(
      `
        UPDATE EVENTS
        SET created_by_user_id = ?
        WHERE created_by_user_id IS NULL
      `,
      [admin_user_id]
    );

    console.log(
      `Default admin ready: ${default_admin_user.user_email} / ${default_admin_user.user_password} (user_id: ${admin_user_id})`
    );

    app.listen(server_port, () => {
      console.log(`Server running on port ${server_port}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

start_server();
