import "./factorio-header.js";
import "./factorio-panel.js";
import "./factorio-panel-light.js";
import "./factorio-card.js";

const searchButton = document.querySelector("#search-btn");
const searchBox = document.querySelector("#search");
const searchLimitBox = document.querySelector("#search-limit");
const output = document.querySelector("#output");

async function query() {
	searchButton.classList.toggle("is-loading");

	let filter = {};
	let sort = { favorites: -1 };
	let limit = 10;

	if (searchBox.value) {
		filter = searchBox.value;
	}

	if (searchLimitBox.value) {
		limit = searchLimitBox.value;
	}

	const response = await fetch("https://factorio-library.noahemke.com/api/content/query", {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({filter: filter, limit: limit})
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