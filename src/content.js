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

/**
 * Gets a provided list of ids or the provided users favorites and responds with
 * the corresponding blueprints.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {object} data POST body in JSON.
 */
async function queryFavorites(request, response, data) {
  // Guard against missing data
  if (!data.limit || !(data.login || data.ids)) {
    utilities.sendCode(
      request,
      response,
      400,
      '400MissingFields',
      'This endpoint requires limit and either login or ids fields.',
    );
    return;
  }

  let favoriteIds = data.ids;
  if (data.login) {
    const user = await database.readUserByLogin(data.login);

    // Guard against invalid or expired login
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

    favoriteIds = user.favorites;
  }

  const output = await database.readFavorites(favoriteIds, data.limit);

  // Respond with the found favorites
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(output));
}

/**
 * Increments or decrements the favorite count of a given blueprint.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {object} data POST body in JSON.
 */
async function editFavorites(request, response, data) {
  // Guard against missing data
  if (!data.id || !data.action || !data.login) {
    utilities.sendCode(
      request,
      response,
      400,
      '400MissingFields',
      'This endpoint requires id, login, and action fields.',
    );
    return;
  }

  const user = await database.readUserByLogin(data.login);

  // Guard against invalid or expired login
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

  // Update favorite counts if necessary
  if (data.action === 'add' && !user.favorites.includes(data.id)) {
    await database.updateUserFavorites(data.login, data.id, true);
    await database.updateFavoriteCount(data.id, 1);
  } else if (user.favorites.includes(data.id)) {
    await database.updateUserFavorites(data.login, data.id, false);
    await database.updateFavoriteCount(data.id, -1);
  }

  response.statusCode = 204;
  response.end();
}

module.exports = { addEntry, queryFavorites, editFavorites };
