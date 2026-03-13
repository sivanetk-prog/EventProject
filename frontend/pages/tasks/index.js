let mode = 'CREATE'
let selectedId = ''

const statusLabel = { todo: 'Todo', in_progress: 'In Progress', done: 'Done' }

window.onload = async () => {
  await Promise.all([loadProjects(), loadUsers()])
  await loadData()
}

const loadProjects = async () => {
  try {
    const response = await api.projects.getAll()
    const select = document.getElementById('project_id')
    response.data.forEach(p => {
      const option = document.createElement('option')
      option.value = p.id
      option.textContent = p.name
      select.appendChild(option)
    })
  } catch (error) {
    console.log(error)
  }
}

const loadUsers = async () => {
  try {
    const response = await api.users.getAll()
    const select = document.getElementById('assigned_user_id')
    response.data.forEach(user => {
      const option = document.createElement('option')
      option.value = user.id
      option.textContent = `${user.firstname} ${user.lastname}`
      select.appendChild(option)
    })
  } catch (error) {
    console.log(error)
  }
}

const loadData = async () => {
  try {
    const response = await api.tasks.getAll()
    const tasks = response.data

    let html = '<div class="form-card" style="padding:0;overflow:hidden;"><table><thead><tr><th>ID</th><th>งาน</th><th>โปรเจกต์</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>'
    for (const t of tasks) {
      const assignee = t.assigned_firstname ? `${t.assigned_firstname} ${t.assigned_lastname}` : '-'
      html += `<tr>
        <td>${t.id}</td>
        <td>${t.title}<br><small>${t.description || ''}</small></td>
        <td>${t.project_name}</td>
        <td>${assignee}</td>
        <td><span class="badge ${t.status}">${statusLabel[t.status]}</span></td>
        <td>
          <div class="btn-row">
            <button class="button button-outline-edit edit"
              data-id="${t.id}"
              data-title="${t.title}"
              data-desc="${t.description || ''}"
              data-status="${t.status}"
              data-project="${t.project_id}"
              data-user="${t.assigned_user_id || ''}">✏️ แก้ไข</button>
            <button class="button button-outline-danger delete" data-id="${t.id}">🗑️ ลบ</button>
          </div>
        </td>
      </tr>`
    }
    html += '</tbody></table></div>'
    document.getElementById('tasks').innerHTML = html

    document.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const d = e.target.dataset
        mode = 'EDIT'
        selectedId = d.id
        document.getElementById('title').value = d.title
        document.getElementById('description').value = d.desc
        document.getElementById('status').value = d.status
        document.getElementById('project_id').value = d.project
        document.getElementById('assigned_user_id').value = d.user
        document.getElementById('submit-btn').textContent = 'บันทึกการแก้ไข'
        document.getElementById('cancel-btn').style.display = 'inline-block'
      })
    })

    document.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('ยืนยันการลบ?')) return
        try {
          await api.tasks.remove(e.target.dataset.id)
          await loadData()
        } catch (error) {
          console.log(error)
        }
      })
    })
  } catch (error) {
    console.log(error)
  }
}

const submitData = async () => {
  const messageDOM = document.getElementById('message')
  const data = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    status: document.getElementById('status').value,
    project_id: document.getElementById('project_id').value,
    assigned_user_id: document.getElementById('assigned_user_id').value || null
  }

  try {
    if (mode === 'CREATE') {
      await api.tasks.create(data)
      messageDOM.innerText = 'สร้างงานสำเร็จ!'
    } else {
      await api.tasks.update(selectedId, data)
      messageDOM.innerText = 'แก้ไขงานสำเร็จ!'
      cancelEdit()
    }
    messageDOM.className = 'message success'
    document.getElementById('title').value = ''
    document.getElementById('description').value = ''
    await loadData()
  } catch (error) {
    const msg = error.response?.data?.message || error.message
    const errors = error.response?.data?.errors || []
    let html = `<div>${msg}</div><ul>`
    errors.forEach(e => { html += `<li>${e}</li>` })
    html += '</ul>'
    messageDOM.innerHTML = html
    messageDOM.className = 'message danger'
  }
}

const cancelEdit = () => {
  mode = 'CREATE'
  selectedId = ''
  document.getElementById('title').value = ''
  document.getElementById('description').value = ''
  document.getElementById('status').value = 'todo'
  document.getElementById('project_id').value = ''
  document.getElementById('assigned_user_id').value = ''
  document.getElementById('submit-btn').textContent = '+ สร้างงาน'
  document.getElementById('cancel-btn').style.display = 'none'
  document.getElementById('message').className = 'message'
}
