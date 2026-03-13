let mode = 'CREATE'
let selectedId = ''

window.onload = async () => {
  await loadUsers()
  await loadData()
}

const loadUsers = async () => {
  try {
    const response = await api.users.getAll()
    const select = document.getElementById('user_id')
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
    const response = await api.projects.getAll()
    const projects = response.data

    let html = '<div class="form-card" style="padding:0;overflow:hidden;"><table><thead><tr><th>ID</th><th>ชื่อโปรเจกต์</th><th>เจ้าของ</th><th>จัดการ</th></tr></thead><tbody>'
    for (const p of projects) {
      html += `<tr>
        <td>${p.id}</td>
        <td>${p.name}<br><small>${p.description || ''}</small></td>
        <td>${p.firstname} ${p.lastname}</td>
        <td>
          <div class="btn-row">
            <button class="button button-outline-edit edit" data-id="${p.id}" data-name="${p.name}" data-desc="${p.description || ''}">✏️ แก้ไข</button>
            <button class="button button-outline-danger delete" data-id="${p.id}">🗑️ ลบ</button>
          </div>
        </td>
      </tr>`
    }
    html += '</tbody></table></div>'
    document.getElementById('projects').innerHTML = html

    document.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const { id, name, desc } = e.target.dataset
        mode = 'EDIT'
        selectedId = id
        document.getElementById('name').value = name
        document.getElementById('description').value = desc
        document.getElementById('submit-btn').textContent = 'บันทึกการแก้ไข'
        document.getElementById('cancel-btn').style.display = 'inline-block'
      })
    })

    document.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('ยืนยันการลบ?')) return
        try {
          await api.projects.remove(e.target.dataset.id)
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
    name: document.getElementById('name').value,
    description: document.getElementById('description').value,
    user_id: document.getElementById('user_id').value
  }

  try {
    if (mode === 'CREATE') {
      await api.projects.create(data)
      messageDOM.innerText = 'สร้างโปรเจกต์สำเร็จ!'
    } else {
      await api.projects.update(selectedId, data)
      messageDOM.innerText = 'แก้ไขโปรเจกต์สำเร็จ!'
      cancelEdit()
    }
    messageDOM.className = 'message success'
    document.getElementById('name').value = ''
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
  document.getElementById('name').value = ''
  document.getElementById('description').value = ''
  document.getElementById('submit-btn').textContent = '+ สร้างโปรเจกต์'
  document.getElementById('cancel-btn').style.display = 'none'
  document.getElementById('message').className = 'message'
}
