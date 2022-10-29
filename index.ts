import express from 'express'

const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')

app.use(express.json())
app.use(cookieParser())
app.use(cors())

// Routers
const usersRouter = require('./routes/Users')
app.use('/auth', usersRouter)

app.listen(3001, () => {
  console.log('Server running on port 3001')
})
