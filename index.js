require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const connection = require('./db');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// respond to requests on `/`
app.get('/', (req, res) => {
  res.send('Hello');
});

// respond to requests on `/api/users`
app.get('/api/users', (req, res) => {
  connection.query('SELECT * FROM user', (err, results) => {
    if (err) {
      res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    } else {
      res.json(results);
    }
  });
});

// respond to requests on `/api/users/:id`
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  connection.query('SELECT * FROM user WHERE id = ?', [userId], (err, results) => {
    if (err) {
      res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    } else {
      res.json(results);
    }
  });
});

const userValidationMiddlewares = [
  check('email').isEmail(),
  check('password').isLength({ min: 8 }),
  check('name').isLength({ min: 2 }),
];

// Insert request for new user
app.post('/api/users', userValidationMiddlewares, (req, res) => {
  const formData = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  connection.query('INSERT INTO user SET ?', formData, (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Email already exists',
        });
      }
      return res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    }
    // Show new user information
    return connection.query('SELECT * FROM user WHERE id = ?', results.insertId, (err2, records) => {
      if (err2) {
        return res.status(500).json({
          error: err2.message,
          sql: err2.sql,
        });
      }
      const insertedUser = records[0];
      const { password, ...user } = insertedUser;
      const host = req.get('host');
      const location = `http://${host}${req.url}/${user.id}`;
      return res
        .status(201)
        .set('Location', location)
        .json(user);
    });
  });
});

// Update request for user
app.put('/api/users/:id', userValidationMiddlewares, (req, res) => {
  const idUser = req.params.id;
  const formData = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  connection.query('UPDATE user SET ? WHERE id = ?', [formData, idUser], (err, results) => {
    if (err) {
      return res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    }
    // Show updated user information
    return connection.query('SELECT * FROM user WHERE id = ?', idUser, (err2, records) => {
      if (err2) {
        return res.status(500).json({
          error: err2.message,
          sql: err2.sql,
        });
      }
      const insertedUser = records[0];
      const { password, ...user } = insertedUser;
      const host = req.get('host');
      const location = `http://${host}${req.url}/${user.id}`;
      return res
        .status(200)
        .set('Location', location)
        .json(user);
    });
  });
});

app.listen(process.env.PORT || 3001, (err) => {
  if (err) {
    throw new Error('Something bad happened...');
  }
  console.log(`Listening on ${process.env.PORT}`);
});
