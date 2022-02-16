#!/usr/bin/env node
"use strict"
const http = require('http');

const secret = process.env.GITHUB_SECRET;

const server = http.createServer((req, res) => {
	res.statusCode = 200
  res.setHeader('Content-Type', 'text/html')
  res.end(`<h1>Hello, ${req.url}</h1>`)
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