const database = require('./database.js');
const utilities = require('./utilities.js');

/**
 * Checks format of provided data and enters it into the database.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {object} data POST body in JSON.
 */
async function addEntry(request, response, data) {
  // Guard against missing data
  if (!data.login || !data.content) {
    utilities.sendCode(
      request,
      response,
      400,
      '400MissingFields',
      'This endpoint requires login and content fields.',
    );
    return;
  }

  const user = await database.readUserByLogin(data.login);

  // Guard against invalid login
  if (!user || user.login.expires < Date.now()) {
    utilities.sendCode(
      request,
      response,
      401,
      '401InvalidOrExpired',
      'The login provided is invalid or expired.',
    );
    return;
  }

  // TODO: Might be a good idea to do formatting serverside
  // Guard against badly formatted content
  if (data.content.author !== user.username
    || data.content.favorites !== 0
    || !(data.content.type === 'blueprint_book' || data.content.type === 'blueprint')
    || !data.content.content
    || !data.content.exportString) {
    utilities.sendCode(
      request,
      response,
      400,
      '400BadContent',
      'The content provided is not formatted correctly.',
    );
    return;
  }

  const result = await database.createBlueprint(data.content);

  // Catch failed database entry
  if (!result.insertedId) {
    utilities.sendCode(
      request,
      response,
      500,
      '500CreationFailed',
      'The database failed to save the data.',
    );
    return;
  }

  // Respond with the id of the new data
  // TODO: change sendcode to sendjson and use that. change client to expect json.
  response.writeHead(201, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(result.insertedId));
}

module.exports = { addEntry };
