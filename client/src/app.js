import "./factorio-header.js";
import "./factorio-panel.js";
import "./factorio-panel-light.js";
import "./factorio-card.js";
import "./app-login.js";
import { getLocal } from "./utils.js";
import "https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.6/pako.js";


//#region references to dom
const searchButton = document.querySelector("#search-btn");
const searchBox = document.querySelector("#search");
const searchLimitBox = document.querySelector("#search-limit");
const output = document.querySelector("#output");
const uploadForm = document.querySelector('#upload-form');
const uploadBtn = document.querySelector('#upload-btn');
const uploadSubmit = document.querySelector('#upload-submit');
const uploadIn = document.querySelector('#upload-in');
const uploadInfo = document.querySelector('#upload-info');
//#endregion

// Hide upload when clicking outside it
uploadForm.onclick = (e) => {
	if (e.target == uploadForm) {
		uploadForm.classList.add('hidden');
	}
}

if (getLocal().limit) {
	searchLimitBox.value = getLocal().limit;
}

if (getLocal().search != null) {
	searchBox.value = getLocal().search;
}
query();

uploadBtn.onclick = () => {
	uploadForm.classList.remove('hidden');
};

// upload submit action
uploadSubmit.onclick = async () => {
	uploadSubmit.classList.add('is-loading');

	const exportString = uploadIn.value;

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
			uploadSubmit.classList.remove('is-loading');
			uploadIn.classList.add('is-danger');
			uploadInfo.innerHTML =
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
				uploadSubmit.classList.remove('loading');
				uploadIn.classList.add('is-danger');
				break;

			case 500:
				// Server error adding data. tell user and abort
				uploadSubmit.classList.remove('loading');
				uploadIn.classList.add('is-danger');
				uploadInfo.innerHTML =
					`server error`;
				break;

			case 400:
				// client error forming request. tell user and abort
				uploadSubmit.classList.remove('loading');
				uploadIn.classList.add('is-danger');
				uploadInfo.innerHTML =
					`client error`;
				break;

			case 200:
				// success. tell user and show them the id returned
				uploadSubmit.classList.remove('loading');
				uploadIn.classList.add('is-primary');
				uploadInfo.innerHTML =
					`Success! Id of new item: ${await response.text()}`;
				break;

			default:
				// unknown error, tell user and abort
				uploadSubmit.classList.remove('loading');
				uploadIn.classList.add('is-danger');
				uploadInfo.innerHTML =
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

	try {
		const response = await fetch("https://factorio-library.noahemke.com/api/content/query", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filter: filter, limit: limit, login: getLocal().login })
		});
		const json = await response.json();
		console.log(json);
		output.innerHTML = "";
		if (json.login) {
			settings = getLocal();
			settings.login = json.login;
			localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));
		}
		json.content.forEach(e => {
			let card = document.createElement("factorio-card");
			card.item = e;
			if (json.favorites != "Not logged in" && json.favorites != "Invalid login") {
				if (json.favorites.includes(e._id)) {
					card.dataset.favorited = true;
				}
			} else {
				if (getLocal().favorites.includes(e._id)) {
					card.dataset.favorited = true;
				}
			}
			output.appendChild(card);
		});
	} catch (e) {
		output.innerHTML = "<p class='is-danger'>Error connecting to server!</p>";
	}
	searchButton.classList.toggle("is-loading");
}

searchButton.onclick = query;