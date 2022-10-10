const fs = require('fs');

/**
 * Checks if a file is valid and accessible.
 * @param {string} filePath The path of the file to check.
 * @returns True if file is accessible, false otherwise.
 */
function checkValidFile(filePath) {
  try {
    fs.accessSync(filePath);
  } catch (error) {
    return false;
  }
  return true;
}

/**
 * Negotiates an acceptable content type based on clients accepted types and those
 * available to be sent.
 * @param {*} request The client request object.
 * @param {[string]} availableTypes
 * @returns The appropriate content type to send to the client.
 */
function determineType(request, availableTypes) {
  // Search the clients accepted types for the first option available.
  const type = request.headers.accept.split(',').find((element) => {
    // Get rid of version or quality values and presume the list is already
    // sorted by preference.
    const testedType = element.split(';')[0];

    // Check if the type in question is available
    if (availableTypes.includes(testedType)) {
      return true;
    }

    // Check if the type in question is a wildcard
    if (testedType === '*/*') {
      return true;
    }

    return false;
  });

  if (!type) {
    // Indicate that there are no acceptable responses.
    return false;
  }

  // Get rid of version or quality values again
  const trimmedType = type.split(';')[0];

  if (trimmedType === '*/*') {
    // If the client doesnt care, use default
    return availableTypes[0];
  }

  // If a type was found, use it
  return trimmedType;
}

/**
 * Converts json to xml.
 * @param {object} json The json to be converted.
 * @returns Xml representation of the passed json.
 */
function jsonToXml(json) {
  let xml = '<response>';
  Object.keys(json).forEach((key) => {
    xml += `<${key}>${json[key]}</${key}>`;
  });
  xml += '</response>';

  return xml;
}

/**
 * Sends a simple message and id back to the client with a status code.
 * @param {*} request The client request object.
 * @param {*} response The server response object.
 * @param {number} code The status code to send.
 * @param {string} id The error id to send if applicable. Null otherwise.
 * @param {string} message The message to send to client.
 */
function sendCode(request, response, code, id, message) {
  const contentType = determineType(request, ['application/json', 'text/xml']);
  response.writeHead(code, { 'Content-Type': contentType });

  if (request.method !== 'HEAD') {
    const responseJSON = { message };
    if (id) {
      responseJSON.id = id;
    }

    let responseContent;
    if (contentType === 'text/xml') {
      responseContent = jsonToXml(responseJSON);
    } else {
      responseContent = JSON.stringify(responseJSON);
    }

    response.write(responseContent);
  }

  response.end();
}

module.exports = {
  checkValidFile, determineType, jsonToXml, sendCode,
};
