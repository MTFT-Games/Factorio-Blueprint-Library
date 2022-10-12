/* TODO: should probably make the email a setting
   TODO: email a known good mail on setup to ensure its working or use .verify
   TODO: Figure out another mailing solution since google is being difficult
   TODO: Move the creation of the transport to the rest of the connection setup. */
// #region Requires
const nodemailer = require('nodemailer').createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.MAIL_AUTH
  }
});
// TODO: Do I need both of these?
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const base64url = require('base64url');
const utilities = require('./utilities.js');
const database = require('./database.js');
// #endregion

/*
The login process is summarized as follows:
First the client should call verify to ensure a name is available and confirm
client-side that the email is correct.
Then the account should be created with new. And the initial login can be used.
In further sessions, login can be used to gain a new login token.
*/

/**
 * Checks that a username is available and sends an email with a code also sent
 * to the client to verify client-side the email is correct.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {object} data POST body in JSON.
 */
async function verify(request, response, data) {
  // Guard against missing data
  if (!data.email || !data.username) {
    utilities.sendCode(
      request,
      response,
      400,
      '400MissingFields',
      'This endpoint requires both email and username fields.',
    );
    return;
  }

  // Guard against a user that already exists
  if (await database.readUser(data.username)) {
    utilities.sendCode(
      request,
      response,
      409,
      '409UserAlreadyExists',
      'The user already exists and is therefore invalid for a new user.',
    );
    return;
  }

  // Generate and email verification code
  const code = Math.floor(Math.random() * 10000);
  nodemailer.sendMail({
    from: 'factorio-library@noahemke.com',
    to: data.email,
    subject: 'Factorio Library account confirmation',
    text: `A Factorio Library account is being created with this email as the recovery email. If this was you, your code is ${code}. If it wasn't you, please ignore and delete this email and no account will be normally created without the code.`,
  }, (error) => {
    if (error) {
      console.error(`[ERROR]: Could not send verification email\n${error}`);
      utilities.sendCode(
        request,
        response,
        500,
        '500EmailError',
        'Could not send verification email. Check that the a valid email was used '
        + 'or contact the app maintainer.',
      );
      return;
    }
    // TODO: change sendcode to sendjson and use that. change client to expect json.
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end(`${code}`);
  });
}

/**
 * Generates a login token based on the request time and username.
 * @param {string} username The username making the token.
 * @returns Login token.
 */
function generateToken(username) {
  const requestTime = Date.now();
  // Expire in 20 mins
  const generatedLogin = { key: '', expires: requestTime + 1200000 };
  const payload = JSON.stringify({ username, iat: requestTime });
  const signature = crypto.createHmac('sha256', process.env.SECRET).update(base64url(payload)).digest('hex');
  const token = `${base64url(payload)}.${base64url(signature)}`;
  generatedLogin.key = token;

  return generatedLogin;
}

/**
 * Checks given username and password and sends back a login token.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {object} data POST body in JSON.
 */
async function login(request, response, data) {
  // TODO: Enable login by email as well as username
  // Guard against missing data
  if (!data.username || !data.password) {
    utilities.sendCode(
      request,
      response,
      400,
      '400MissingFields',
      'This endpoint requires both username and password fields.',
    );
    return;
  }

  const user = await database.readUser(data.username);

  // Guard against invalid credentials
  if (!user || !await bcrypt.compare(data.password, user.password)) {
    utilities.sendCode(
      request,
      response,
      401,
      '401InvalidUserOrPass',
      'The username and/or password you entered are incorrect.',
    );
    return;
  }

  // Create login data
  const token = generateToken(data.username);
  await database.updateLogin(data.username, token);

  // Send token back in response
  // TODO: change sendcode to sendjson and use that. change client to expect json.
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(token));
}

/**
 * Creates a user with the given username, email, and password.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {object} data POST body in JSON.
 */
async function createUser(request, response, data) {
  // Guard against missing data
  if (!data.username || !data.password || !data.email) {
    utilities.sendCode(
      request,
      response,
      400,
      '400MissingFields',
      'This endpoint requires username, password, and email fields.',
    );
    return;
  }

  // Guard against a user that already exists
  if (await database.readUser(data.username)) {
    utilities.sendCode(
      request,
      response,
      409,
      '409UserAlreadyExists',
      'The user already exists and is therefore invalid for a new user.',
    );
    return;
  }

  // Hash the password for safe password storage
  const passHash = bcrypt.hash(data.password, 10);

  const generatedLogin = generateToken(data.username);

  await database.createUser(data.username, await passHash, data.email, generatedLogin);

  // Respond with the new login token
  // TODO: change sendcode to sendjson and use that. change client to expect json.
  response.writeHead(201, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(generatedLogin));
}

module.exports = {
  verify, login, generateToken, createUser,
};
