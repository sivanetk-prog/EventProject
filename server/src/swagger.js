const spec = {
  openapi: '3.0.0',
  info: {
    title: 'web101 Task Management API',
    version: '1.0.0',
    description: 'REST API สำหรับระบบจัดการโปรเจกต์และ Task'
  },
  servers: [{ url: 'http://localhost:8000', description: 'Local server' }],
  tags: [
    { name: 'Users', description: 'จัดการผู้ใช้งาน' },
    { name: 'Projects', description: 'จัดการโปรเจกต์' },
    { name: 'Tasks', description: 'จัดการ Task' },
    { name: 'Tags', description: 'จัดการ Tag' }
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'สมชาย' },
          lastname: { type: 'string', example: 'ใจดี' },
          age: { type: 'integer', example: 25 },
          gender: { type: 'string', enum: ['ชาย', 'หญิง', 'ไม่ระบุ'], example: 'ชาย' },
          interests: { type: 'string', example: 'วิดีโอเกม' },
          description: { type: 'string', example: 'นักพัฒนาซอฟต์แวร์' }
        }
      },
      UserInput: {
        type: 'object',
        required: ['firstname', 'lastname', 'age', 'gender', 'interests', 'description'],
        properties: {
          firstname: { type: 'string', example: 'สมชาย' },
          lastname: { type: 'string', example: 'ใจดี' },
          age: { type: 'integer', example: 25 },
          gender: { type: 'string', enum: ['ชาย', 'หญิง', 'ไม่ระบุ'], example: 'ชาย' },
          interests: { type: 'string', example: 'วิดีโอเกม' },
          description: { type: 'string', example: 'นักพัฒนาซอฟต์แวร์' }
        }
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'เว็บไซต์บริษัท' },
          description: { type: 'string', example: 'พัฒนาเว็บไซต์หลักของบริษัท' },
          user_id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'สมชาย' },
          lastname: { type: 'string', example: 'ใจดี' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      ProjectInput: {
        type: 'object',
        required: ['name', 'user_id'],
        properties: {
          name: { type: 'string', example: 'เว็บไซต์บริษัท' },
          description: { type: 'string', example: 'พัฒนาเว็บไซต์หลักของบริษัท' },
          user_id: { type: 'integer', example: 1 }
        }
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'ออกแบบ UI หน้าแรก' },
          description: { type: 'string', example: 'ออกแบบ mockup หน้า landing page' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'], example: 'todo' },
          project_id: { type: 'integer', example: 1 },
          project_name: { type: 'string', example: 'เว็บไซต์บริษัท' },
          assigned_user_id: { type: 'integer', nullable: true, example: 1 },
          assigned_firstname: { type: 'string', nullable: true, example: 'สมชาย' },
          assigned_lastname: { type: 'string', nullable: true, example: 'ใจดี' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      TaskWithTags: {
        allOf: [
          { $ref: '#/components/schemas/Task' },
          {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { $ref: '#/components/schemas/Tag' }
              }
            }
          }
        ]
      },
      TaskInput: {
        type: 'object',
        required: ['title', 'project_id'],
        properties: {
          title: { type: 'string', example: 'ออกแบบ UI หน้าแรก' },
          description: { type: 'string', example: 'ออกแบบ mockup หน้า landing page' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'], example: 'todo' },
          project_id: { type: 'integer', example: 1 },
          assigned_user_id: { type: 'integer', nullable: true, example: 1 }
        }
      },
      Tag: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'bug' }
        }
      },
      TagInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'bug' }
        }
      },
      SuccessMessage: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'insert ok' },
          data: { type: 'object' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'กรอกข้อมูลไม่ครบ' },
          errors: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  paths: {
    // ─── Users ─────────────────────────────────────────────────────────────────
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'ดึงรายชื่อผู้ใช้ทั้งหมด',
        responses: {
          200: {
            description: 'รายชื่อผู้ใช้',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } }
          }
        }
      },
      post: {
        tags: ['Users'],
        summary: 'สร้างผู้ใช้ใหม่',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserInput' } } }
        },
        responses: {
          200: { description: 'สร้างสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          400: { description: 'ข้อมูลไม่ครบ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'ดึงข้อมูลผู้ใช้ตาม id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'ข้อมูลผู้ใช้', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          404: { description: 'ไม่พบผู้ใช้', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        tags: ['Users'],
        summary: 'แก้ไขข้อมูลผู้ใช้',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserInput' } } }
        },
        responses: {
          200: { description: 'แก้ไขสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } }
        }
      },
      delete: {
        tags: ['Users'],
        summary: 'ลบผู้ใช้ (cascade ลบ projects และ tasks ด้วย)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'ลบสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } }
        }
      }
    },
    // ─── Projects ──────────────────────────────────────────────────────────────
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'ดึงรายชื่อโปรเจกต์ทั้งหมด',
        responses: {
          200: {
            description: 'รายชื่อโปรเจกต์',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Project' } } } }
          }
        }
      },
      post: {
        tags: ['Projects'],
        summary: 'สร้างโปรเจกต์ใหม่',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } }
        },
        responses: {
          200: { description: 'สร้างสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          400: { description: 'ข้อมูลไม่ครบ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'ดึงข้อมูลโปรเจกต์พร้อม tasks ทั้งหมด',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'ข้อมูลโปรเจกต์',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Project' },
                    { type: 'object', properties: { tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } }
                  ]
                }
              }
            }
          },
          404: { description: 'ไม่พบโปรเจกต์', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        tags: ['Projects'],
        summary: 'แก้ไขโปรเจกต์',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } }
        },
        responses: {
          200: { description: 'แก้ไขสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } }
        }
      },
      delete: {
        tags: ['Projects'],
        summary: 'ลบโปรเจกต์ (cascade ลบ tasks ด้วย)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'ลบสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } }
        }
      }
    },
    // ─── Tasks ─────────────────────────────────────────────────────────────────
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'ดึง task ทั้งหมด',
        responses: {
          200: {
            description: 'รายชื่อ task',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } }
          }
        }
      },
      post: {
        tags: ['Tasks'],
        summary: 'สร้าง task ใหม่',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } }
        },
        responses: {
          200: { description: 'สร้างสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          400: { description: 'ข้อมูลไม่ครบ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'ดึง task พร้อม tags',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'ข้อมูล task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskWithTags' } } } },
          404: { description: 'ไม่พบ task', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        tags: ['Tasks'],
        summary: 'แก้ไข task (เช่น อัปเดต status)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } }
        },
        responses: {
          200: { description: 'แก้ไขสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } }
        }
      },
      delete: {
        tags: ['Tasks'],
        summary: 'ลบ task',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'ลบสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } }
        }
      }
    },
    '/tasks/{id}/tags': {
      post: {
        tags: ['Tasks'],
        summary: 'เพิ่ม tag ให้ task',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['tag_id'], properties: { tag_id: { type: 'integer', example: 1 } } } } }
        },
        responses: {
          200: { description: 'เพิ่ม tag สำเร็จ', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'add tag ok' } } } } } },
          400: { description: 'ไม่ระบุ tag_id', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/tasks/{id}/tags/{tagId}': {
      delete: {
        tags: ['Tasks'],
        summary: 'เอา tag ออกจาก task',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'tagId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'ลบ tag สำเร็จ', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'remove tag ok' } } } } } }
        }
      }
    },
    // ─── Tags ──────────────────────────────────────────────────────────────────
    '/tags': {
      get: {
        tags: ['Tags'],
        summary: 'ดึง tag ทั้งหมด',
        responses: {
          200: {
            description: 'รายชื่อ tag',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Tag' } } } }
          }
        }
      },
      post: {
        tags: ['Tags'],
        summary: 'สร้าง tag ใหม่ (ชื่อต้องไม่ซ้ำ)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TagInput' } } }
        },
        responses: {
          200: { description: 'สร้างสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } }
        }
      }
    }
  }
}

module.exports = spec
