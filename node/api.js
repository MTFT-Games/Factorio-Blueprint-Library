#!/usr/bin/env node
"use strict"
const http = require('http');
const crypto = require('crypto');
const exec = require('child_process').exec;


const secret = process.env.GITHUB_SECRET;
const docs = `
	<h1>Factorio Blueprint Library API Docs</h1>
	<hr>
	<h2>Login</h2>
	<h3>/login</h3> 
  <p>Requires a username, a bool to remember this computer, and the hashed password.</p> 
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
		a random code, emails it to the provided address and returns the hash of 
		the code for the client to check against.
  </p>
	<p>
		Returns the hash of the code for client to check user response against before 
		sending /login/new.
	</p>

	<h3>/login/new</h3> 
  <p>Requires username, password hash, and an email.</p>
  <p>
		Check if a matching username exists and return an error if so, otherwise 
		crate a new user entry and generate new login key to be set and returned.
	</p>
  <p>Returns login key.</p>
	<hr>
	<h2>Content</h2>
	<h3>/content/favorites</h3>
	<p>Requires a login key and page size.</p>
	<p>
  	Gets the favorite Ids of the user, queries for each Ids entry and returns 
		all the entries.
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
`;

const server = http.createServer((req, res) => {
	res.setHeader('Content-Type', 'text/html');

	switch (req.url) {
		// Docs page describing functions and usage
		case '/':
			res.statusCode = 200;
			res.end(docs);
			break;

		case '/login':
		case '/login/verify':
		case '/login/new':
		case '/content/favorites':
		case '/content/query':
			res.statusCode = 501;
			res.end(`<h1>${req.url} is not implemented yet.</h1>`);
			break;

		// Pull the git repo when github hebhook is received
		case '/git':
			req.on('data', (chunk) => {
				let signature = "sha1=" + 
					crypto.createHmac('sha1', secret).update(chunk.toString()).digest('hex');

				// Check for valid signature
				if (req.headers['x-hub-signature'] == sig) {
					res.statusCode = 200;
					res.end();
					console.log(exec('cd /var/www/factorio-library && git pull')); // Pull from github
					// End the process so systemd restarts it with the new version pulled from git
					process.kill(process.pid, 'SIGTERM'); 
				}
			});

			res.statusCode = 200;
			res.end("eom");
			break;

		// Anything else is not a valid endpoint
		default:
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/html');
			res.end(`<h1>${req.url} is not a valid endpoint.</h1>`);
			break;
	}
	// Do stuff
});

server.listen(8081, () => {
	console.log(`Server running`);
});

process.on('SIGTERM', () => {
	server.close(() => {
		console.log('Process terminated')
	})
})