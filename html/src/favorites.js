import "./factorio-header.js";
import "./factorio-panel.js";
import "./factorio-panel-light.js";
import "./factorio-card.js";

//#region references to dom
const refreshBtn = document.querySelector("#refresh-btn");
const limitBox = document.querySelector("#search-limit");
const output = document.querySelector("#output");
const loginBtn = document.querySelector('#login-btn');
const loggedInAccount = document.querySelector('#logged-in-account');
const loginForm = document.querySelector('#login-form');
const confirmForm = document.querySelector('#confirm-form');
const confirmBtn = document.querySelector('#confirm-btn');
const cancelBtn = document.querySelector('#cancel-btn');
//#endregion

function getLocal() {
	let local = JSON.parse(localStorage.getItem('nre5152-p1-settings'));
	if (local) {
		return local;
	} else {
		local = { user: "", login: null, favorites: [] };
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

document.querySelector('#clear-local-btn').onclick = () => {
	let settings = getLocal();
	settings.favorites = [];
	localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));
	getFavorites();
};

document.querySelector('#clear-server-btn').onclick = async () => {
	document.querySelector('#clear-server-btn').classList.add('is-loading');
	const cards = document.querySelectorAll('factorio-card[data-favorited="true"]');
	const promises = [];
	// Unfavorite each card
	for (const card of cards) {
		promises.push(card.shadowRoot.querySelector('.favorite-btn').onclick());
	}
	// Make sure all cards have finished unfavoriting
	for (const promise of promises) {
		await promise;
	}
	document.querySelector('#clear-server-btn').classList.remove('is-loading');
	getFavorites();
};

// Check if the user is already logged in
if (getLocal().login && getLocal().login.expires > Date.now()) {
	loggedInAccount.innerHTML = getLocal().user;
	loginBtn.onclick = logout();
	// TODO: set hovers
	document.querySelector('#clear-server-btn').disabled = false;
	document.querySelector('#clear-local-btn').disabled = true;
	document.querySelector('#clear-server-btn').title = "";
	document.querySelector('#clear-local-btn').title = "Must be logged out";
} else {
	loginBtn.onclick = () => {
		loginForm.classList.remove('hidden');
	};
}

if (getLocal().user != "") {
	document.querySelector('#username-in').value = getLocal().user;
}

if (getLocal().limit) {
	limitBox.value = getLocal().limit;
}

refreshBtn.onclick = () => {
	getFavorites();
};

getFavorites();

function logout() {
	//TODO
}

async function getFavorites() {
	refreshBtn.classList.toggle("is-loading");

	let limit = 10;

	let settings = getLocal();
	settings.limit = limitBox.value;
	localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));

	if (limitBox.value) {
		limit = parseInt(limitBox.value);
	}

	let response;
	if (getLocal().login && getLocal().login.expires > Date.now()) {
		response = await fetch("https://factorio-library.noahemke.com/api/content/favorites", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ limit: limit, login: getLocal().login })
		});
	} else {
		response = await fetch("https://factorio-library.noahemke.com/api/content/favorites", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids: getLocal().favorites, limit: limit })
		});
	}
	const json = await response.json();
	console.log(json);
	output.innerHTML = "";
	json.forEach(e => {
		let card = document.createElement("factorio-card");
		card.item = e;
		card.dataset.favorited = true;
		output.appendChild(card);
	});
	refreshBtn.classList.toggle("is-loading");
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
			getFavorites();
			document.querySelector('#clear-server-btn').disabled = false;
			document.querySelector('#clear-local-btn').disabled = true;
			document.querySelector('#clear-server-btn').title = "";
			document.querySelector('#clear-local-btn').title = "Must be logged out";
			loginForm.classList.add('hidden');
		} else {
			document.querySelector('#login-submit').classList.remove('loading');
			document.querySelector('#username-in').classList.add('is-danger');
			document.querySelector('#password-in').classList.add('is-danger');
		}
	}
}