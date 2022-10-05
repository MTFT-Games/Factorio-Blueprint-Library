#!/usr/bin/env node
// #region Requires
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const exec = require('child_process').execSync;
const nodemailer = require('nodemailer').createTransport({
  service: 'gmail',
  auth: {
    user: 'factoriolibrary@gmail.com',
    pass: process.env.MAIL_PASS,
  },
});
const bcrypt = require('bcryptjs');
const base64url = require('base64url');
const database = require('./database.js');
// #endregion

const secret = process.env.GITHUB_SECRET;

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// TODO: Get rid of this. Make it a file.
// TODO: Optimize await calls.
const docs = `
	<h1>Factorio Blueprint Library API Docs</h1>
	<hr>
	<h2>Login</h2>
	<h3>/login</h3> 
  <p>Requires a username, a bool to remember this computer, and the password.</p> 
  <p>
		Queries database for a user that matches the name and password. If none are 
		found, return invalid credentials error, otherwise generates a new login key 
		and sets it in the user entry with an expiration a set time after, then 
		returns the login key to the client.
	</p>
  <p>Returns login key.</p>
	
	<h3>/login/verify</h3>
  <p>Requires a username and email.</p>
	<p>
  	Checks if the username is used and returns an error if so, otherwise generates 
		a random code, emails it to the provided address and returns the the code 
		for the client to check against. This should be improved in the future since this does nothing to effectively stop someone intentionally using someone elses email, it just makes sure that a normal user didn't mistype their recovery email.
  </p>
	<p>
		Returns the code for client to check user response against before 
		sending /login/new.
	</p>

	<h3>/login/new</h3> 
  <p>Requires username, password, and an email.</p>
  <p>
		Check if a matching username exists and return an error if so, otherwise 
		crate a new user entry and generate new login key to be set and returned.
	</p>
  <p>Returns login key.</p>
	<hr>
	<h2>Content</h2>
	<h3>/content/favorites</h3>
	<p>Requires a login key and page size or id and action.</p>
	<p>
  	Gets the favorite Ids of the user, queries for each Ids entry and returns 
		all the entries or adds or removes a specified id from favorites.
	</p>
  <p>Returns favorite entries.</p>

	<h3>/content/query</h3>
  <p>Optional filter, optional sort, optional login key and Requires page limit.</p>
  <p>
		Performs a query with the given filter, limit, and sort and returns the 
		results. If a login key was given, also refreshes it and returns the new 
		key and their favorite Ids.
	</p>
  <p>Returns results, optionally favorites and login key.</p>

	<h3>/content/new</h3>
  <p>Requires login key and object to enter.</p>
  <p>
		Checks the user of the login key and adds the object to the database if it is formatted properly.
	</p>
  <p>Returns if of added object login key.</p>

	<h3>maybe update and delete later</h3>
	<h3>todo: add to favorites</h3>
`;

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
    }, (error, info) => {
      if (error) {
        console.log(error);
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
    if (data.content.author == user.username
      && data.content.favorites == 0
      && (data.content.type == 'blueprint_book' || data.content.type == 'blueprint')
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
    if (data.action == 'add') {
      // check user favs and update if needed
      if (user.favorites.includes(data.id)) {
        res.statusCode = 200;
        res.end();
      } else {
        await database.updateUserFavorites(data.login, data.id, true);
        await database.updateFavoriteCount(data.id, 1);
        res.statusCode = 200;
        res.end();
      }
    } else {
      // check user favs and update if needed
      if (user.favorites.includes(data.id)) {
        await database.updateUserFavorites(data.login, data.id, false);
        await database.updateFavoriteCount(data.id, -1);
        res.statusCode = 200;
        res.end();
      } else {
        res.statusCode = 200;
        res.end();
      }
    }
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

  // handle cors preflights from fetch
  if (req.method == 'OPTIONS' && req.headers['access-control-request-method']) {
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
    // Checks useername and password hash and returns a login key.
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
    // Checks the user of the login key and adds the object to the database if it is formatted properly.
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
        if (req.headers['x-hub-signature'] == signature) {
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
  console.log('SIGTERM received, closing MongoDB client...');
  await client.close();
  console.log('closing http server...');
  server.close(() => {
    console.log('Process terminated.');
  });
});

function generateToken(data) {
  const requestTime = Date.now();
  const generatedLogin = { key: '', expires: requestTime + 1200000 };
  const payload = JSON.stringify({ username: data.username, iat: requestTime });
  const signature = crypto.createHmac('sha256', secret).update(base64url(payload)).digest('hex');
  const token = `${base64url(payload)}.${base64url(signature)}`;
  generatedLogin.key = token;

  return generatedLogin;
}
