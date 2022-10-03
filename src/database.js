const { MongoClient } = require('mongodb');

// TODO: Check for auth key and err if not
// TODO: Make mongo host an env var
const client = new MongoClient(
  `mongodb://API:${process.env.MONGO_AUTH}@noahemke.com/factorio-library`);
let users;
let blueprints;


/**
 * Establish a connection to the Mongo database.
 */
async function connectMongo() {
  try {
    await client.connect();
    // Establish and verify connection
    await client.db('factorio-library').command({ ping: 1 });
    console.log('[INFO]: Connected successfully to server');
    users = await client.db('factorio-library').collection('users');
    blueprints = await client.db('factorio-library').collection('blueprints');
  } catch (err) {
    console.error(`[ERROR]: Could not establish connection with database\n${err}`);
    process.exit(1);
  } finally {
    console.log('[INFO]: Done with mongo startup');
  }
}

/**
 * Retrieves a given user from the database.
 * @param {string} username The username of the account to retrieve.
 * @returns A promise resolving to null or a document of the user.
 */
function readUser(username) {
  return users.findOne({ username: username });
}

// TODO: See if its possible to reasonably combine these two ^^vv

/**
 * Retrieves a user from the database by a login token.
 * @param {object} loginToken The login token to find the user with.
 * @returns A promise resolving to null or a document of the user.
 */
function readUserByLogin(loginToken) {
  return users.findOne({ login: loginToken });
}

/**
 * Adds a new user to the database with the given data.
 * @param {string} username The username of the new user.
 * @param {string} passHash The hashed password of the user.
 * @param {string} email The email to be associated with the user.
 * @param {object} loginToken The initial login token generated for the first login.
 * @returns InsertOneResult
 */
function createUser(username, passHash, email, loginToken) {
  return users.insertOne({
    username: username,
    password: passHash,
    email: email,
    login: loginToken,
    favorites: [],
  });
}

/**
 * Updates the login token of a user in the database.
 * @param {string} username The username of the user that's login is being updated.
 * @param {object} loginToken The new token to be written to the database.
 * @returns Unknown
 */
function updateLogin(username, loginToken) {
  return users.updateOne({ username: username }, { $set: { login: loginToken } });
}

// TODO: See if its possible to reasonably combine these two ^^vv

/**
 * Updates the login token of a user with an existing token in the database.
 * @param {object} currentToken The current token of the user to be updated.
 * @param {object} newToken The new token to be set.
 * @returns Unknown
 */
function updateLoginByToken(currentToken, newToken) {
  return users.updateOne({ login: currentToken }, { $set: { login: newToken } });
}

/**
 * Updates a user's stored faforites by adding or removing a given blueprint id from their favorites.
 * @param {object} loginToken The current login token of the user to edit.
 * @param {string} dataId The blueprint id to add or remove.
 * @param {boolean} add A boolean to indicate the desired operation. True will add the favorite, false will remove.
 * @returns Unknown
 */
function updateUserFavorites(loginToken, dataId, add) {
  if (add) {
    return users.updateOne({ login: loginToken }, { $push: { favorites: dataId } });
  } else {
    return users.updateOne({ login: loginToken }, { $pull: { favorites: dataId } });
  }
}

/**
 * Adds a blueprint to the database.
 * @param {object} blueprint The blueprint to be added.
 * @returns InsertOneResult
 */
function createBlueprint(blueprint) {
  return blueprints.insertOne(data.content);
}

/**
 * Reads blueprints from the database by a list of IDs.
 * @param {*} favoriteIds 
 * @param {*} limit 
 */
// TODO: Left off here. also think again about function naming
function readFavorites(favoriteIds, limit) {
  blueprints.find({ _id: { $in: mappedFavorites } }).limit(data.limit).toArray();
}

module.exports = { connectMongo, readUser, createUser, updateLogin, readUserByLogin, updateUserFavorites, updateLoginByToken, createBlueprint, };