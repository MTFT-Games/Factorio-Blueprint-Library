import "./factorio-header.js";
import "./factorio-panel.js";
import "./factorio-panel-light.js";
import "./factorio-card.js";
import "https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.6/pako.js";


//#region references to dom
const searchButton = document.querySelector("#search-btn");
const searchBox = document.querySelector("#search");
const searchLimitBox = document.querySelector("#search-limit");
const output = document.querySelector("#output");
const loginBtn = document.querySelector('#login-btn');
const loggedInAccount = document.querySelector('#logged-in-account');
const loginForm = document.querySelector('#login-form');
const uploadForm = document.querySelector('#upload-form');
const uploadBtn = document.querySelector('#upload-btn');
//#endregion

function getLocal() {
	let local = JSON.parse(localStorage.getItem('nre5152-p1-settings'));
	if (local) {
		return local;
	} else {
		local = { user: "", login: null };
		localStorage.setItem('nre5152-p1-settings', JSON.stringify(local));
		return local;
	}
}

// Hide login when clicking outside it
loginForm.onclick = (e) => {
	if (e.target == loginForm) {
		loginForm.classList.add('hidden');
	}
}

// Hide upload when clicking outside it
uploadForm.onclick = (e) => {
	if (e.target == uploadForm) {
		uploadForm.classList.add('hidden');
	}
}

// Check if the user is already logged in
if (getLocal().login && getLocal().login.expires > Date.now()) {
	loggedInAccount.innerHTML = getLocal().user;
	loginBtn.onclick = logout();
	// TODO: set hovers
	uploadBtn.disabled = false;
	uploadBtn.title = "";
} else {
	loginBtn.onclick = () => {
		loginForm.classList.remove('hidden');
	};
}

if (getLocal().user != "") {
	document.querySelector('#username-in').value = getLocal().user;
}

if (getLocal().limit) {
	searchLimitBox.value = getLocal().limit;
}

if (getLocal().search != null) {
	searchBox.value = getLocal().search;
	query();
}

uploadBtn.onclick = () => {
	uploadForm.classList.remove('hidden');
};

function logout() {
	//TODO
}

// Login submit action
document.querySelector('#login-submit').onclick = async () => {
	const userIn = document.querySelector('#username-in').value;
	const passIn = document.querySelector('#password-in').value;

	if (userIn && passIn) {
		document.querySelector('#login-submit').classList.add('loading');
		const response = await fetch("https://factorio-library.noahemke.com/api/login", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: userIn, password: passIn })
		});

		if (response.ok) {
			let localState = getLocal();
			localState.login = await response.json();
			localState.user = userIn;
			localStorage.setItem('nre5152-p1-settings', JSON.stringify(localState));

			loggedInAccount.innerHTML = getLocal().user;
			loginBtn.onclick = logout();
			// TODO: set hovers
			// refresh search
			uploadBtn.disabled = false;
			uploadBtn.title = "";
			loginForm.classList.add('hidden');
		} else {
			document.querySelector('#login-submit').classList.remove('loading');
			document.querySelector('#username-in').classList.add('is-danger');
			document.querySelector('#password-in').classList.add('is-danger');
		}
	}
}

// upload submit action
document.querySelector('#upload-submit').onclick = async () => {
	document.querySelector('#upload-submit').classList.add('loading');

	const exportString = document.querySelector('#upload-in').value;

	if (exportString) {
		let content = {
			author: getLocal().user,
			favorites: 0,
			exportString: exportString
		};

		let blueprintJson = {};
		try {
			blueprintJson = JSON.parse(
				new TextDecoder("utf-8").decode(pako.inflate(atob(exportString.substring(1)))));
		} catch (error) {
			document.querySelector('#upload-submit').classList.remove('loading');
			document.querySelector('#upload-in').classList.add('is-danger');
			document.querySelector('#upload-info').innerHTML =
					`parsing error: ${error}`;
			return;
		}

		content.content = blueprintJson;
		if (blueprintJson.blueprint) {
			content.type = 'blueprint';
		} else {
			content.type = 'blueprint_book';
		}

		const response = await fetch("https://factorio-library.noahemke.com/api/content/new", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login: getLocal().login, content: content })
		});

		switch (response.status) {
			case 401:
				// Login expired, update login button to show login and disable button. probably also tell the user to log in again
				document.querySelector('#upload-submit').classList.remove('loading');
				document.querySelector('#upload-in').classList.add('is-danger');
				break;

			case 500:
				// Server error adding data. tell user and abort
				document.querySelector('#upload-submit').classList.remove('loading');
				document.querySelector('#upload-in').classList.add('is-danger');
				document.querySelector('#upload-info').innerHTML =
					`server error`;
				break;

			case 400:
				// client error forming request. tell user and abort
				document.querySelector('#upload-submit').classList.remove('loading');
				document.querySelector('#upload-in').classList.add('is-danger');
				document.querySelector('#upload-info').innerHTML =
					`client error`;
				break;

			case 200:
				// success. tell user and show them the id returned
				document.querySelector('#upload-submit').classList.remove('loading');
				document.querySelector('#upload-in').classList.add('is-primary');
				document.querySelector('#upload-info').innerHTML =
					`Success! Id of new item: ${await response.text()}`;
				break;

			default:
				// unknown error, tell user and abort
				document.querySelector('#upload-submit').classList.remove('loading');
				document.querySelector('#upload-in').classList.add('is-danger');
				document.querySelector('#upload-info').innerHTML =
					`unknown error`;
				break;
		}
	}
}


async function query() {
	searchButton.classList.toggle("is-loading");

	let filter = {};
	let sort = { favorites: -1 };
	let limit = 10;

	if (searchBox.value) {
		filter = { $or: [{ "content.blueprint.label": { $regex: searchBox.value, $options: 'i' } }, { "content.blueprint_book.label": { $regex: searchBox.value, $options: 'i' } }] };
	}

	let settings = getLocal();
	settings.search = searchBox.value;
	settings.limit = searchLimitBox.value;
	localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));

	if (searchLimitBox.value) {
		limit = parseInt(searchLimitBox.value);
	}

	const response = await fetch("https://factorio-library.noahemke.com/api/content/query", {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ filter: filter, limit: limit })
	});
	const json = await response.json();
	console.log(json);
	output.innerHTML = "";
	json.content.forEach(e => {
		let card = document.createElement("factorio-card");
		card.item = e;
		output.appendChild(card);
	});
	searchButton.classList.toggle("is-loading");
}

searchButton.onclick = query;