import "./factorio-header.js";
import "./factorio-panel.js";
import "./factorio-panel-light.js";
import "./factorio-card.js";
import "./app-login.js";
import { getLocal } from "./utils.js";

//#region references to dom
const refreshBtn = document.querySelector("#refresh-btn");
const limitBox = document.querySelector("#search-limit");
const output = document.querySelector("#output");
// These are unused but are planned to be used in a future feature
// const confirmForm = document.querySelector('#confirm-form');
// const confirmBtn = document.querySelector('#confirm-btn');
// const cancelBtn = document.querySelector('#cancel-btn');
//#endregion

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

if (getLocal().limit) {
	limitBox.value = getLocal().limit;
}

refreshBtn.onclick = () => {
	getFavorites();
};

getFavorites();

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