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
 * @param {*} loginToken The login token to find the user with.
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

module.exports = { connectMongo, readUser, createUser, updateLogin, readUserByLogin, };