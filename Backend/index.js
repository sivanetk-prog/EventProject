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

function save_event_image(event_image_data) {
  if (!event_image_data) {
    return null;
  }

  const image_match = String(event_image_data).match(
    /^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/i
  );

  if (!image_match) {
    throw create_http_error(400, 'Invalid image format');
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

async function ensure_event_image_column() {
  const [column_rows] = await database.query(
    `
      SELECT COUNT(*) AS column_count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'EVENTS'
        AND COLUMN_NAME = 'event_image'
    `,
    [database_config.database]
  );

  if (Number(column_rows[0].column_count) === 0) {
    await database.query(
      `
        ALTER TABLE EVENTS
        ADD COLUMN event_image VARCHAR(255) NULL
        AFTER event_description
      `
    );
  }
}

async function ensure_event_owner_column() {
  const [column_rows] = await database.query(
    `
      SELECT COUNT(*) AS column_count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'EVENTS'
        AND COLUMN_NAME = 'created_by_user_id'
    `,
    [database_config.database]
  );

  if (Number(column_rows[0].column_count) === 0) {
    await database.query(
      `
        ALTER TABLE EVENTS
        ADD COLUMN created_by_user_id INT NULL
        AFTER event_image
      `
    );
  }
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
    const [existing_column_rows] = await database.query(
      `
        SELECT COUNT(*) AS column_count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'registrations'
          AND COLUMN_NAME = ?
      `,
      [database_config.database, column_row.column_name]
    );

    if (Number(existing_column_rows[0].column_count) === 0) {
      await database.query(
        `
          ALTER TABLE registrations
          ADD COLUMN ${column_row.column_name} ${column_row.sql_type}
          AFTER ${column_row.after_column}
        `
      );
    }
  }
}

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
    throw create_http_error(401, 'Admin user_id is required');
  }

  const user_row = await get_user_by_id(user_id);
  if (!user_row) {
    throw create_http_error(404, 'User not found');
  }

  if (user_row.user_role !== 'admin') {
    throw create_http_error(403, 'Only admin can manage events');
  }

  return user_row;
}

async function require_authenticated_user(user_id) {
  if (!user_id) {
    throw create_http_error(401, 'user_id is required');
  }

  const user_row = await get_user_by_id(user_id);
  if (!user_row) {
    throw create_http_error(404, 'User not found');
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
    throw create_http_error(404, 'Event not found');
  }

  if (
    user_row.user_role !== 'admin' &&
    Number(event_row.created_by_user_id) !== Number(user_row.user_id)
  ) {
    throw create_http_error(403, 'Only the event creator or admin can edit or delete this event');
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

async function require_registration_access(registration_id, user_id) {
  const user_row = await require_authenticated_user(user_id);
  const registration_row = await get_registration_by_id(registration_id);

  if (!registration_row) {
    throw create_http_error(404, 'Registration not found');
  }

  if (
    user_row.user_role !== 'admin' &&
    Number(registration_row.user_id) !== Number(user_row.user_id)
  ) {
    throw create_http_error(403, 'Only the registration owner or admin can cancel this registration');
  }

  return { user_row, registration_row };
}

async function get_or_create_user_id(participant_name) {
  const user_email = build_guest_user_email(participant_name);

  const [existing_user_rows] = await database.query(
    'SELECT user_id FROM users WHERE user_email = ? LIMIT 1',
    [user_email]
  );

  if (existing_user_rows.length > 0) {
    return existing_user_rows[0].user_id;
  }

  const [insert_user_result] = await database.query(
    `
      INSERT INTO users (user_name, user_email, user_phone, user_password, user_role)
      VALUES (?, ?, NULL, ?, 'participant')
    `,
    [participant_name, user_email, 'guest1234']
  );

  return insert_user_result.insertId;
}

async function ensure_default_admin_user() {
  const [existing_admin_rows] = await database.query(
    `
      SELECT user_id
      FROM users
      WHERE user_email = ?
      LIMIT 1
    `,
    [default_admin_user.user_email]
  );

  if (existing_admin_rows.length > 0) {
    await database.query(
      `
        UPDATE users
        SET user_role = 'admin'
        WHERE user_id = ?
      `,
      [existing_admin_rows[0].user_id]
    );

    return existing_admin_rows[0].user_id;
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

app.get('/health', async_handler(async (request, response) => {
  await database.query('SELECT 1');
  response.json({ ok: true, database_status: 'connected' });
}));

app.post('/users/register', async (request, response) => {
  const { user_name, user_email, user_phone, user_password } = request.body;

  if (!user_name || !user_email || !user_password) {
    return response.status(400).json({
      message: 'user_name, user_email, and user_password are required'
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
      message: 'Created user successfully',
      user_row
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(400).json({ message: 'This email is already registered' });
    }

    send_error_response(response, error);
  }
});

app.post('/auth/login', async_handler(async (request, response) => {
  const { user_email, user_password } = request.body;

  if (!user_email || !user_password) {
    return response.status(400).json({
      message: 'user_email and user_password are required'
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
    throw create_http_error(401, 'Invalid email or password');
  }

  response.json({
    message: 'Login successful',
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
            WHEN r.registration_id IS NOT NULL AND r.registration_status <> 'cancelled' THEN 1
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
    `
  );

  response.json(event_rows);
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
      message: 'event_name, event_date, event_time, event_location, and event_capacity are required'
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
    message: 'Created event successfully',
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

  response.json({ message: 'Updated event successfully', event_image });
}));

app.delete('/events/:event_id', async_handler(async (request, response) => {
  const { event_id } = request.params;
  const { user_id } = request.body;

  const { event_row: existing_event_row } = await require_event_owner(event_id, user_id);

  await database.query('DELETE FROM registrations WHERE event_id = ?', [event_id]);
  await database.query('DELETE FROM EVENTS WHERE event_id = ?', [event_id]);
  delete_event_image_file(existing_event_row.event_image);

  response.json({ message: 'Deleted event successfully' });
}));

app.post('/registrations', async (request, response) => {
  const {
    event_id,
    user_id,
    participant_name,
    first_name,
    last_name,
    gender,
    age,
    food_allergies
  } = request.body;

  try {
    const normalized_first_name = String(first_name || '').trim();
    const normalized_last_name = String(last_name || '').trim();
    const normalized_gender = String(gender || '').trim();
    const normalized_food_allergies = String(food_allergies || '').trim();
    const normalized_age = age === '' || age === null || age === undefined
      ? null
      : Number(age);
    const registration_full_name =
      build_participant_full_name(normalized_first_name, normalized_last_name) ||
      String(participant_name || '').trim();

    if (!normalized_first_name || !normalized_last_name || !normalized_gender) {
      throw create_http_error(400, 'first_name, last_name, and gender are required');
    }

    if (normalized_age === null || Number.isNaN(normalized_age) || normalized_age <= 0) {
      throw create_http_error(400, 'age must be a number greater than 0');
    }

    const [event_rows] = await database.query(
      `
        SELECT
          e.event_id,
          e.event_capacity,
          COALESCE(SUM(
            CASE
              WHEN r.registration_id IS NOT NULL AND r.registration_status <> 'cancelled' THEN 1
              ELSE 0
            END
          ), 0) AS registration_count
        FROM EVENTS e
        LEFT JOIN registrations r ON r.event_id = e.event_id
        WHERE e.event_id = ?
        GROUP BY e.event_id, e.event_capacity
      `,
      [event_id]
    );

    if (event_rows.length === 0) {
      throw create_http_error(404, 'Event not found');
    }

    const event_row = event_rows[0];
    if (Number(event_row.registration_count) >= Number(event_row.event_capacity)) {
      throw create_http_error(400, 'This event is full');
    }

    const registration_user_id =
      user_id || (registration_full_name ? await get_or_create_user_id(registration_full_name) : null);

    if (!registration_user_id) {
      throw create_http_error(400, 'user_id or participant profile is required');
    }

    const existing_registration_row = await get_existing_registration(event_id, registration_user_id);

    if (existing_registration_row) {

      if (String(existing_registration_row.registration_status || '').toLowerCase() !== 'cancelled') {
        throw create_http_error(400, 'This user already registered for this event');
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
            registration_status = 'pending',
            registration_date = NOW()
          WHERE registration_id = ?
        `,
        [
          normalized_first_name,
          normalized_last_name,
          normalized_gender,
          normalized_age,
          normalized_food_allergies || null,
          existing_registration_row.registration_id
        ]
      );

      return response.json({
        message: 'Registered successfully',
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
        normalized_food_allergies || null
      ]
    );

    response.status(201).json({
      message: 'Registered successfully',
      registration_id: insert_registration_result.insertId,
      user_id: registration_user_id
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(400).json({
        message: 'This user already registered for this event'
      });
    }

    send_error_response(response, error);
  }
});

app.patch('/registrations/:registration_id/cancel', async_handler(async (request, response) => {
  const { registration_id } = request.params;
  const { user_id } = request.body;

  const { registration_row } = await require_registration_access(registration_id, user_id);

  if (String(registration_row.registration_status || '').toLowerCase() === 'cancelled') {
    return response.json({
      message: 'Registration already cancelled',
      registration_id: registration_row.registration_id
    });
  }

  await database.query(
    `
      UPDATE registrations
      SET registration_status = 'cancelled'
      WHERE registration_id = ?
    `,
    [registration_id]
  );

  response.json({
    message: 'Cancelled registration successfully',
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

  response.json(registration_rows);
}));

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
