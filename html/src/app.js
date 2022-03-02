import "./factorio-header.js";
import "./factorio-panel.js";
import "./factorio-panel-light.js";
import "./factorio-card.js";

//#region references to dom
const searchButton = document.querySelector("#search-btn");
const searchBox = document.querySelector("#search");
const searchLimitBox = document.querySelector("#search-limit");
const output = document.querySelector("#output");
const loginBtn = document.querySelector('#login-btn');
const loggedInAccount = document.querySelector('#logged-in-account');
const loginForm = document.querySelector('#login-form');
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

// Check if the user is already logged in
if (getLocal().login && getLocal().login.expires > Date.now()) {
	loggedInAccount.innerHTML = getLocal().user;
	loginBtn.onclick = logout();
	// TODO: set hovers
	// enable upload
} else {
	loginBtn.onclick = () => {
		loginForm.classList.remove('hidden');
	};
}

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
			// enable upload
			loginForm.classList.add('hidden');
		} else {
			document.querySelector('#login-submit').classList.remove('loading');
			document.querySelector('#username-in').classList.add('is-danger');
			document.querySelector('#password-in').classList.add('is-danger');
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

	if (searchLimitBox.value) {
		limit = searchLimitBox.value;
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