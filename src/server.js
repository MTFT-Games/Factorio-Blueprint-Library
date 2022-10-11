#!/usr/bin/env node
// #region Requires
require('dotenv').config();
const http = require('http');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path').posix;
const database = require('./database.js');
const utilities = require('./utilities.js');
const fileResponses = require('./fileResponses.js');
const login = require('./login.js');
// #endregion

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

// Async function to confirm a free user and create a new account
async function createUser(req, res, data) {
  if (data.username && data.password && data.email) {
    res.setHeader('Content-Type', 'application/json');
    if (await database.readUser(data.username)) {
      res.statusCode = 409;
      res.end('Username taken');
    } else {
      const passHash = bcrypt.hash(data.password, 10);
      const generatedLogin = login.generateToken(data.username);
      await database.createUser(data.username, await passHash, data.email, generatedLogin);
      res.statusCode = 200;
      res.end(JSON.stringify(generatedLogin));
    }
  }
}

async function addEntry(req, res, data) {
  if (data.login && data.content) {
    res.setHeader('Content-Type', 'application/json');
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

async function contentQuery(req, res, data) {
  if (data.limit) {
    const output = {};

    // Check login and get favorites
    if (data.login) {
      const user = await database.readUserByLogin(data.login);
      if (user) {
        output.favorites = user.favorites;

        const token = login.generateToken(data.username);

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
}

// Struct to manage any cases that should be handled in a specific way
const specialCases = {
  '/': (request, response) => fileResponses.serveFile(request, response, `${webdir}/home.html`),
  '/api/': (request, response) => fileResponses.serveFile(request, response, `${webdir}/apidocs.html`),
  '/api/login/verify': (req, res) => utilities.parseBody(req, res, login.verify),
  '/api/login/new': (req, res) => utilities.parseBody(req, res, createUser),
  '/api/login': (req, res) => utilities.parseBody(req, res, login.login),
  '/api/content/new': (req, res) => utilities.parseBody(req, res, addEntry),
  '/api/content/query': (req, res) => utilities.parseBody(req, res, contentQuery),
  '/api/content/favorites': (req, res) => {
    utilities.parseBody(req, res, (request, response, data) => {
      if (data.limit && (data.login || data.ids)) {
        queryFavorites(data, response);
      } else if (data.id && data.action && data.login) {
        editFavorites(data, response);
      } else {
        response.statusCode = 500;
        response.end('malformed data');
      }
    });
  },
};

function onRequest(request, response) {
  const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
  const resolvedPath = path.normalize(parsedUrl.pathname);

  // Check if the requested resource is a special case
  if (specialCases[resolvedPath]) {
    specialCases[resolvedPath](request, response, parsedUrl.searchParams);
  } else if ((request.method === 'GET' || request.method === 'HEAD') && utilities.checkValidFile(webdir + resolvedPath)) {
    // If a file exists at the requested path, get it.
    fileResponses.serveFile(request, response, webdir + resolvedPath);
  } else {
    utilities.sendCode(
      request,
      response,
      404,
      '404NotFound',
      'The page or resource you have requested does not exist.',
    );
  }
}

const server = http.createServer(onRequest);

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
