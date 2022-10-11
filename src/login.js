// TODO: should probably make the email a setting
// TODO: email a known good mail on setup to ensure its working or use .verify
// TODO: Figure out another mailing solution since google is being difficult
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
const database = require('./database.js');
const utilities = require('./utilities.js');

/*
The login process is summarized as follows:
First the client should call verify to ensure a name is available and confirm
client-side that the email is correct.
Then the account should be created with new. And the initial login can be used.
In further sessions, login can be used to gain a new login token.
*/

// Async function to check if a username is valid and send an email to verify the email
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
    from: 'factoriolibrary@gmail.com',
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

module.exports = { verify };
