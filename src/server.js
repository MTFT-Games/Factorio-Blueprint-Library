#!/usr/bin/env node
// #region Requires
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path').posix;
const database = require('./database.js');
const utilities = require('./utilities.js');
const fileResponses = require('./fileResponses.js');
const login = require('./login.js');
const content = require('./content.js');
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

// Struct to manage any cases that should be handled in a specific way
const specialCases = {
  '/': (request, response) => fileResponses.serveFile(request, response, `${webdir}/home.html`),
  '/api/': (request, response) => fileResponses.serveFile(request, response, `${webdir}/apidocs.html`),
  '/api/login/verify': (req, res) => utilities.parseBody(req, res, login.verify),
  '/api/login/new': (req, res) => utilities.parseBody(req, res, login.createUser),
  '/api/login': (req, res) => utilities.parseBody(req, res, login.login),
  '/api/content/new': (req, res) => utilities.parseBody(req, res, content.addEntry),
  '/api/content/query': (req, res) => utilities.parseBody(req, res, content.contentQuery),
  '/api/content/favorites': (req, res) => {
    utilities.parseBody(req, res, (request, response, data) => {
      if (data.limit && (data.login || data.ids)) {
        content.queryFavorites(request, response, data);
      } else if (data.id && data.action && data.login) {
        content.editFavorites(request, response, data);
      } else {
        utilities.sendCode(
          request,
          response,
          400,
          '400MissingFields',
          'This endpoint requires either (limit and either login or ids) or '
          + '(id, action, and login) fields.',
        );
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
