const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const databasePath = path.join(__dirname, 'userData.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const validatePass = password => {
  return password.length > 4
}

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const pass = await bcrypt.hash(password, 10)
  const getUser = `
    SELECT
    *
    FROM
    user
    WHERE
    username='${username}';`
  const dbUser = await database.get(getUser)
  if (dbUser === undefined) {
    const createUser = `
        INSERT INTO
        user(username,name,password,gender,location)
        VALUES('${username}','${name}','${pass}','${gender}','${location}');`
    let val = validatePass(password)
    if (val) {
      await database.run(createUser)
      response.status(200)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const pass = await bcrypt.hash(password, 10)
  const getUser = `
    SELECT
    *
    FROM
    user
    WHERE
    username='${username}';`
  const dbUser = await database.get(getUser)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const val = await bcrypt.compare(password, dbUser.password)
    if (val === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const pass = await bcrypt.hash(newPassword, 10)
  const getUser = `
    SELECT
    *
    FROM
    user
    WHERE
    username='${username}';`
  const dbUser = await database.get(getUser)
  const val = await bcrypt.compare(oldPassword, dbUser.password)
  if (val === true) {
    if (validatePass(newPassword)) {
      const upQuery = `
            UPDATE
            user
            SET
            password='${pass}'
            WHERE
            username='${username}';`
      await database.run(upQuery)
      response.status(200)
      response.send('Password updated')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('Invalid current password')
  }
})

module.exports = app
