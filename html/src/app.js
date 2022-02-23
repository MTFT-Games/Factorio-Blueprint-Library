import "./factorio-header.js";
import "./factorio-panel.js";
import "./factorio-panel-light.js";

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
	//output.innerHTML = json.content;
	output.innerHTML = "Im not gonna beat around the bush, this just straight up isn't ready on time. Last week was rough with 4 exams and it lined up with me just being super sleep deprived from destroying my sleep schedule. I did get a lot of work done on this but it was focused mostly on server side api because with how I plan to get everything working, most of the api needs to work in order to start on the front end of the webapp. I got most of the api set up but unfortunately it took more time than expected and i was only able to just get started on the front end part here. I think my only option at this point is just take the point hit on checkpoint 2 and have something that im really proud of for the final. If you'd like to see the progress so far that isnt quite so visible, ive included both this webapp as well as the nodeJS api in the submission and you can see it working by taking a look at the console for the json returned by the api for this query."
	searchButton.classList.toggle("is-loading");
}

searchButton.onclick = query;