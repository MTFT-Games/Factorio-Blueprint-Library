const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
<style>
	.navbar, .navbar-menu {
  	background-color: #313031;
	}
	.navbar {
		box-shadow: inset 3px 0 2px -2px #201815,inset -3px 0 2px -2px #201815,inset 0 -3px 3px -3px #000,0 0 3px 0 #201815;
	}
</style>
<header>
	<nav class="navbar mb-3 py-2">
		<!-- Brand and burger -->
		<div class="navbar-brand">
			<a href="home.html" class="navbar-item" id="brand">
				<img src="images/book.png" alt="blueprint book">
				<h1 class="title has-text-light">Blueprint Library</h1>
			</a>
			<a class="navbar-burger has-text-light" id="burger">
				<span></span>
				<span></span>
				<span></span>
			</a>
		</div>

		<!-- Nav menu -->
		<div class="navbar-menu" id="nav-menu">
			<div class="navbar-end">
				<a class="navbar-item is-tab has-text-light" href="home.html" id="home">
					Home
				</a>

				<a class="navbar-item is-tab has-text-light" href="app.html" id="app">
					App
				</a>

				<a class="navbar-item is-tab has-text-light" href="favorites.html" id="favorites">
					Favorites
				</a>

				<a class="navbar-item is-tab has-text-light" href="documentation.html" id="documentation">
					Documentation
				</a>
			</div>
		</div>
	</nav>
</header>
`;

class FactorioHeader extends HTMLElement {
	constructor() {
		super();

		this.attachShadow({ mode: "open" });
		this.shadowRoot.appendChild(template.content.cloneNode(true));

		// Mobile menu
		this.burgerIcon = this.shadowRoot.querySelector('#burger');
		this.navbarMenu = this.shadowRoot.querySelector('#nav-menu');
	}

	connectedCallback() {
		this.burgerIcon.onclick = () => {
			this.navbarMenu.classList.toggle('is-active');
			this.burgerIcon.classList.toggle('is-active');
		};
	}

	disConnectedCallback() {
		this.burgerIcon.onclick = null;
	}

	attributeChangedCallback(attributeName, oldVal, newVal) {
		if (attributeName == "data-active") {
			oldVal = this.shadowRoot.querySelector(`#${oldVal}`);
			newVal = this.shadowRoot.querySelector(`#${newVal}`);

			if (oldVal) {
				oldVal.classList.toggle('is-active');
				oldVal.classList.toggle('has-text-light');
			}
			if (newVal) {
				newVal.classList.toggle('is-active');
				newVal.classList.toggle('has-text-light');
			}
		}
	}

	static get observedAttributes() {
		return ["data-active"];
	}
}

customElements.define('factorio-header', FactorioHeader);