const template = document.createElement("template");
template.innerHTML = `
<link rel="stylesheet"
href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<style>
.fpanel {
	background-color: #e4cead;
	box-shadow: inset 3px 0 2px -2px #201815,inset 0 3px 2px -2px #8f8c8b,inset -3px 0 2px -2px #201815,inset 0 -3px 3px -3px #000,0 0 3px 0 #201815;
	width: 13em;
}
.panel-inset, .panel-inset-lighter {
    box-shadow: inset 0 0 3px 0 #000,0 -2px 2px -1px #000,-2px 0 2px -2px #0f0d0c,2px 0 2px -2px #0f0d0c,0 2px 2px -2px #ebe6e4;
    background-color: #242324;
}
.panel-inset-lighter {
    background-color: #414040;
}

span.title {
    font-size: 1.2rem;
    text-overflow: ellipsis;
    overflow: hidden;
    width: 100%;
    height: 1.5em;
    display: block;
    white-space: nowrap;
}

div.body {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 4em;
    grid-template-rows: 1fr 1.5em;
}

span.author {
    grid-row: 2 / 3;
    grid-column: 1 / 2;
}

#favorites {
    grid-row: 2 / 3;
    grid-column: 2 / 3;
		text-align: right;
	}

.favorite-btn {
	line-height: 1.5em;
}

#icon-div {
    width: 100%;
    grid-row: 1 / 2;
    grid-column: 1 / -1;
    position: relative;
}

.mini-icon {
    position: absolute;
    width: 45.5%;
}

.icon1, .icon2 {
    top: 3%;
}

.icon3, .icon4 {
    bottom: 4%;
}

.icon1, .icon3 {
    left: 3%;
}

.icon2, .icon4 {
    right: 3%;
}

.book .mini-icon {
    position: absolute;
    width: 30.5%;
}

.book .icon1, .book .icon2 {
    top: 10%;
}

.book .icon3, .book .icon4 {
    bottom: 28%;
}

.book .icon1, .book .icon3 {
    left: 19%;
}

.book .icon2, .book .icon4 {
    right: 18%;
}

.base-icon {
    width: 100%;
}
</style>
<div class="fpanel m-3">
	<span class="title p-2 mb-2"></span>
	<div class="body panel-inset panel-inset-lighter mt-1 p-2 has-text-light">
        <div id="icon-div">
        <img class="base-icon" src="">
        <img class="mini-icon icon1" src="">
        <img class="mini-icon icon2" src="">
        <img class="mini-icon icon3" src="">
        <img class="mini-icon icon4" src="">
        </div>
        <span class="author"></span>
        <span id="favorites">
            <span id="num-favs"></span>
            <i class="favorite-btn fa-regular fa-bookmark"></i>
        </span>
	</div>
</div>
`;

class FactorioCard extends HTMLElement {

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.appendChild(template.content.cloneNode(true));

		this.span = this.shadowRoot.querySelector("span.title");
		this.div = this.shadowRoot.querySelector("div.body");
		this.favBtn = this.shadowRoot.querySelector(".favorite-btn");

		this.favBtn.onclick = async () => {
			let settings = JSON.parse(localStorage.getItem('nre5152-p1-settings'));
			if (this.dataset.favorited == 'true') {
				if (settings.login && settings.login.expires > Date.now()) {
					// remove from favs in server
					// TODO: try block and error catching
					const response = await fetch("https://factorio-library.noahemke.com/api/content/favorites", {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ login: settings.login, action: 'remove', id: this.dataset.id })
					});

					if (response.ok) {
						this.dataset.favorited = false;
					}
				} else {
					settings.favorites.splice(settings.favorites.indexOf(this.dataset.id), 1);
					localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));
					this.dataset.favorited = false;
				}
			} else {
				if (settings.login && settings.login.expires > Date.now()) {
					// add to favs in server
					const response = await fetch("https://factorio-library.noahemke.com/api/content/favorites", {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ login: settings.login, action: 'add', id: this.dataset.id })
					});

					if (response.ok) {
						this.dataset.favorited = true;
					}
				} else {
					settings.favorites.push(this.dataset.id);
					localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));
					this.dataset.favorited = true;
				}
			}
			this.render();
		};
	}

	connectedCallback() {
		this.div.onclick = () => {
			if (!navigator.clipboard) {
				const textArea = document.createElement("textarea");
				textArea.value = this.item.exportString;

				// Avoid scrolling to bottom
				textArea.style.top = "0";
				textArea.style.left = "0";
				textArea.style.position = "fixed";

				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();

				try {
					const successful = document.execCommand('copy');
					const msg = successful ? 'successful' : 'unsuccessful';
					console.log('Fallback: Copying text command was ' + msg);
				} catch (err) {
					console.error('Fallback: Oops, unable to copy', err);
				}

				document.body.removeChild(textArea);
				return;
			}
			navigator.clipboard.writeText(this.item.exportString).then(function () {
				console.log('Async: Copying to clipboard was successful!');
			}, function (err) {
				console.error('Async: Could not copy text: ', err);
			});
		};

		this.render();
	}

	render() {
		if (this._item) {
			let type = this.item.type;
			this.shadowRoot.querySelector('#num-favs').innerHTML = this.item.favorites;
			if (this.item.content[type].label) {
				this.span.innerHTML = this.item.content[type].label;
			} else {
				this.span.innerHTML = "Unnamed";
			}
			if (this.item.type == "blueprint") {
				this.shadowRoot.querySelector(".base-icon").src = "images/sprites/blueprint.png";
			} else {
				this.shadowRoot.querySelector(".base-icon").src = "images/sprites/blueprint-book.png";
			}
			this.shadowRoot.querySelector(".author").innerHTML = this.item.author;
			if (this.dataset.favorited == 'true') {
				this.favBtn.classList.remove('fa-regular');
				this.favBtn.classList.add('fa-solid');
			} else {
				this.favBtn.classList.add('fa-regular');
				this.favBtn.classList.remove('fa-solid');
			}

			if (type == 'blueprint_book') {
				this.shadowRoot.querySelector("#icon-div").classList.add('book');
			}

			this.item.content[type].icons.forEach(element => {
				this.shadowRoot.querySelector(`.icon${element.index}`).src = `images/sprites/${element.signal.name}.png`;
			});
		}
	}

	set item(val) {
		this._item = val;
		this.dataset.id = val._id;
		this.render();
	}

	get item() {
		return this._item;
	}

	attributeChangedCallback(attributeName, oldVal, newVal) {
		if (attributeName == 'data-tint') {
			if (newVal == 'light' || !newVal) {
				this.div.classList.add('panel-inset-lighter');
			} else if (newVal == 'dark') {
				this.div.classList.remove('panel-inset-lighter');
			}
		}
	}

	static get observedAttributes() {
		return ["data-tint"];
	}

	disconnectedCallback() {
		this.div.onclick = null;
	}
	// TODO: ADD HOVER
}

customElements.define('factorio-card', FactorioCard);