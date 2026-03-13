const express = require('express')
const bodyparser = require('body-parser')
const cors = require('cors')
const path = require('path')
const errorHandler = require('./middlewares/errorHandler')
const swaggerSpec = require('./swagger')

const app = express()

app.use(bodyparser.json())
app.use(cors())

app.use('/users', require('./routes/users'))
app.use('/projects', require('./routes/projects'))
app.use('/tasks', require('./routes/tasks'))
app.use('/tags', require('./routes/tags'))

app.get('/api-docs/spec', (req, res) => res.json(swaggerSpec))
app.get('/api-docs', (req, res) => res.sendFile(path.join(__dirname, 'swagger-ui.html')))

app.use(errorHandler)

module.exports = app
