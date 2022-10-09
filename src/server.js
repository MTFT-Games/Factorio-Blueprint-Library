#!/usr/bin/env node
// #region Requires
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const exec = require('child_process').execSync;
// TODO: should probably make the email a setting and verify connection
// TODO: email a known good mail on setup to ensure its working or use .verify
// TODO: I guess set up better auth since google killed less secure apps in march
// TODO: Move the creation of the transport to the rest of the connection setup.
const nodemailer = require('nodemailer').createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: 'factoriolibrary@gmail.com',
    serviceClient: '117043537712628403792',
    privateKey: process.env.MAIL_AUTH,
  },
});
const bcrypt = require('bcryptjs');
const base64url = require('base64url');
const fs = require('fs');
const database = require('./database.js');
// #endregion

const secret = process.env.GITHUB_SECRET;

// #region Settings
// Read and parse settings file TODO: Print nice error if no settings file
const settings = JSON.parse(fs.readFileSync(`${__dirname}/../settings.json`));

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// Attempt to verify and set the webdir to serve from
let webdir;
try {
  webdir = fs.realpathSync(`${__dirname}/../${process.env.NODE_WEBDIR || settings.webdir}`);
} catch (error) {
  // Log error and exit if web directory could not be established
  if (error.code === 'NOENT') {
    console.log(`[ERROR]: Webdir directory ${error.path} not found. `
      + 'Check that webdir is set correctly in settings.json');
  } else {
    console.log(error);
  }
  process.exit(1);
}
// #endregion

// TODO: Optimize await calls.
const docs = fs.readFileSync(`${webdir}/apidocs.html`);

function generateToken(data) {
  const requestTime = Date.now();
  const generatedLogin = { key: '', expires: requestTime + 1200000 };
  const payload = JSON.stringify({ username: data.username, iat: requestTime });
  const signature = crypto.createHmac('sha256', secret).update(base64url(payload)).digest('hex');
  const token = `${base64url(payload)}.${base64url(signature)}`;
  generatedLogin.key = token;

  return generatedLogin;
}

// Async function to check if a username is valid and send an email to verify the email
async function verify(data, res) {
  if (await database.readUser(data.username)) {
    res.statusCode = 409;
    res.end('Username taken');
  } else {
    const code = Math.floor(Math.random() * 10000);
    nodemailer.sendMail({
      from: 'factoriolibrary@gmail.com',
      to: data.email,
      subject: 'Factorio Library account confirmation',
      text: `A Factorio Library account is being created with this email as the recovery email. If this was you, your code is ${code}. If it wasn't you, please ignore and delete this email and no account will be created without the code.`,
    }, (error) => {
      if (error) {
        console.error(`[ERROR]: Could not send email\n${error}`);
        res.statusCode = 400;
        res.end('Error sending confirmation email');
      } else {
        res.statusCode = 200;
        res.end(`${code}`);
      }
    });
  }
}

// Async function to confirm a free user and create a new account
async function createUser(data, res) {
  if (await database.readUser(data.username)) {
    res.statusCode = 409;
    res.end('Username taken');
  } else {
    const passHash = bcrypt.hash(data.password, 10);
    const generatedLogin = generateToken(data);
    await database.createUser(data.username, await passHash, data.email, generatedLogin);
    res.statusCode = 200;
    res.end(JSON.stringify(generatedLogin));
  }
}

async function login(data, res) {
  // Check username
  const user = await database.readUser(data.username);
  if (user) {
    // Check password
    if (await bcrypt.compare(data.password, user.password)) {
      // Generate token
      const token = generateToken(data);

      // Set token in db
      await database.updateLogin(data.username, token);

      // return
      res.statusCode = 200;
      res.end(JSON.stringify(token));
    } else {
      res.statusCode = 401;
      res.end('Invalid username or password');
    }
  } else {
    res.statusCode = 401;
    res.end('Invalid username or password');
  }
}

async function addEntry(data, res) {
  const user = await database.readUserByLogin(data.login);
  // auth
  if (user && user.login.expires > Date.now()) {
    // check that the client formatted it properly
    if (data.content.author === user.username
      && data.content.favorites === 0
      && (data.content.type === 'blueprint_book' || data.content.type === 'blueprint')
      && data.content.content
      && data.content.exportString) {
      const result = await database.createBlueprint(data.content);
      if (result.insertedId) {
        res.statusCode = 200;
        res.end(JSON.stringify(result.insertedId));
      } else {
        res.statusCode = 500;
        res.end('Error adding new data');
      }
    } else {
      res.statusCode = 400;
      res.end('Badly formatted data');
    }
  } else {
    res.statusCode = 401;
    res.end('Invalid or expired login key');
  }
}

async function queryFavorites(data, res) {
  let favoriteIds;
  if (data.login) {
    const user = await database.readUserByLogin(data.login);
    // auth
    if (user && user.login.expires > Date.now()) {
      favoriteIds = user.favorites;
    } else {
      res.statusCode = 401;
      res.end('Invalid or expired login key');
      return;
    }
  } else {
    favoriteIds = data.ids;
  }
  const output = await database.readFavorites(favoriteIds, data.limit);
  res.statusCode = 200;
  res.end(JSON.stringify(output));
}

async function editFavorites(data, res) {
  const user = await database.readUserByLogin(data.login);
  // auth
  if (user && user.login.expires > Date.now()) {
    if (data.action === 'add' && !user.favorites.includes(data.id)) {
      await database.updateUserFavorites(data.login, data.id, true);
      await database.updateFavoriteCount(data.id, 1);
    } else if (user.favorites.includes(data.id)) {
      await database.updateUserFavorites(data.login, data.id, false);
      await database.updateFavoriteCount(data.id, -1);
    }
    res.statusCode = 200;
    res.end();
  } else {
    res.statusCode = 401;
    res.end('Invalid or expired login key');
  }
}

async function contentQuery(data, res) {
  const output = {};

  // Check login and get favorites
  if (data.login) {
    const user = await database.readUserByLogin(data.login);
    if (user) {
      output.favorites = user.favorites;

      const token = generateToken(data);

      // Set token in db
      await database.updateLoginByToken(data.login, token);

      output.login = token;
    } else {
      output.favorites = 'Invalid login';
    }
  } else {
    output.favorites = 'Not logged in';
  }

  output.content = await database.readBlueprints(data.filter, data.sort, data.limit);
  res.statusCode = 200;
  res.end(JSON.stringify(output));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // handle cors preflights from fetch TODO: investigate why postman doesnt like the cors
  if (req.method === 'OPTIONS' && req.headers['access-control-request-method']) {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.end();
    return;
  }

  switch (req.url) {
    // Docs page describing functions and usage
    case '/':
      res.setHeader('Content-Type', 'text/html');
      res.statusCode = 200;
      res.end(docs);
      break;

    // Check if a username is valid and sends an email to verify the email
    case '/login/verify': {
      res.setHeader('Content-Type', 'text/html');
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          verify(JSON.parse(data), res);
        } catch (error) {
          console.log(`Error: ${error}`);
          console.log(`Data: ${data}`);
        }
      });
      break;
    }
    // Double checks username validity and creates a new user, returning a login key.
    case '/login/new': {
      res.setHeader('Content-Type', 'application/json');
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.username && json.password && json.email) {
            createUser(json, res);
          }
        } catch (error) {
          console.log(`Error: ${error}`);
          console.log(`Data: ${data}`);
        }
      });
      break;
    }
    // Checks username and password hash and returns a login key.
    case '/login': {
      res.setHeader('Content-Type', 'application/json');
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.username && json.password) {
            login(json, res);
          }
        } catch (error) {
          console.log(`Error: ${error}`);
          console.log(`Data: ${data}`);
        }
      });
      break;
    }
    // Checks the user of the login key and adds the object to the database
    // if it is formatted properly.
    case '/content/new': {
      res.setHeader('Content-Type', 'application/json');
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.login && json.content) {
            addEntry(json, res);
          } else {
            res.statusCode = 500;
            res.end('malformed data');
          }
        } catch (error) {
          console.log(`Error: ${error}`);
          console.log(`Data: ${data}`);
          res.statusCode = 500;
          res.end('caught exception');
        }
      });
      break;
    }
    case '/content/query': {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.limit) {
            contentQuery(json, res);
          } else {
            res.statusCode = 500;
            res.end('malformed data');
          }
        } catch (error) {
          console.log(`Error: ${error}`);
          console.log(`Data: ${data}`);
          res.statusCode = 500;
          res.end('caught exception');
        }
      });
      break;
    }
    case '/content/favorites': {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.limit && (json.login || json.ids)) {
            queryFavorites(json, res);
          } else if (json.id && json.action && json.login) {
            editFavorites(json, res);
          } else {
            res.statusCode = 500;
            res.end('malformed data');
          }
        } catch (error) {
          console.log(`Error: ${error}`);
          console.log(`Data: ${data}`);
          res.statusCode = 500;
          res.end('caught exception');
        }
      });
      break;
    }
    // Pull the git repo when github hebhook is received
    case '/git': {
      res.setHeader('Content-Type', 'text/html');
      req.on('data', (chunk) => {
        const signature = `sha1=${crypto.createHmac('sha1', secret).update(chunk.toString()).digest('hex')}`;

        // Check for valid signature
        if (req.headers['x-hub-signature'] === signature) {
          res.statusCode = 200;
          res.end();
          exec('cd /var/www/factorio-library && git pull'); // Pull from github
          // End the process so systemd restarts it with the new version pulled from git
          process.kill(process.pid, 'SIGTERM');
        }
      });

      res.statusCode = 200;
      res.end('Git pull attempted v4');
      break;
    }
    // Anything else is not a valid endpoint
    default:
      res.setHeader('Content-Type', 'text/html');
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end(`<h1>${req.url} is not a valid endpoint.</h1>`);
      break;
  }
});

database.connectMongo();

server.listen(port, () => {
  console.log(`[INFO]: Listening on port ${port}`);
});

process.on('SIGTERM', async () => {
  console.log('[INFO]: SIGTERM received, closing MongoDB client');
  await database.close();
  console.log('[INFO]: Closing http server');
  server.close(() => {
    console.log('[INFO]: Process terminated.');
  });
});
