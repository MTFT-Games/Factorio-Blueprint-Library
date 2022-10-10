const fs = require('fs');
const utilities = require('./utilities.js');

/**
 * Sends a file back to the client.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {string} filePath The path to the file to serve.
 */
function serveFile(request, response, filePath) {
  // currently only supports html and css for simplicity

  const fileExtension = filePath.substring(filePath.lastIndexOf('.'));

  // Determine available content types based on file extention.
  let contentType;
  if (fileExtension === '.html') {
    contentType = utilities.determineType(request, ['text/html', 'text/plain']);
  } else if (fileExtension === '.css') {
    contentType = utilities.determineType(request, ['text/css', 'text/plain']);
  } else if (fileExtension === '.js') {
    contentType = utilities.determineType(request, ['text/javascript', 'text/plain']);
  } else {
    // 415 code, unsupported media type
    return utilities.sendCode(
      request,
      response,
      415,
      '415UnsupportedMediaType',
      'The resource you requested is of an unsupported type.',
    );
  }

  response.writeHead(200, { 'Content-Type': contentType });

  if (request.method === 'GET') {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // The file should be checked to be sure it can be accessed before calling this function.
        // If it now cant be read, thats an unknown error.
        return utilities.sendCode(
          request,
          response,
          500,
          '500InternalServerError',
          'The server encountered an unexpected problem getting the resource.',
        );
      }

      response.write(data);
      return response.end();
    });
  } else {
    return response.end();
  }
  // Eslint is mad so heres a return
  return 1;
}

module.exports = { serveFile };
