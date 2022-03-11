import { getLocal } from "./utils.js";

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<style>
.popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 99;
}
.hidden {
  display: none !important;
}
</style>
<button class="button ml-auto is-warning" id="login-btn">
	<span id="logged-in-account">Log in</span>
	<i id="user-icon" class="ml-1 fa-solid fa-user"></i>
</button>
<div class="popup hidden">
		<factorio-panel-light>
			<span slot="title">Login</span>
			<div slot="content">
				<p class="has-text-light is-size-6 has-text-weight-normal"><slot></slot></p>
				<input type="text" class="input" id="username-in" placeholder="Username">
				<input type="password" class="input" id="password-in" placeholder="Password">
				<button id="login-submit" class="button is-primary">Login</button>
				<button class="button" title="New accounts not available yet" disabled>Create
					account</button>
			</div>
		</factorio-panel-light>
	</div>
`;

class AppLogin extends HTMLElement {
  logout = () => {
    //todo
  }

  postLogin = () => {
    // Set login indicator
    this.loggedInAccount.innerHTML = getLocal().user;
    this.loginBtn.classList.remove('is-warning');
    this.loginBtn.classList.add('is-primary');
    this.loginBtn.onclick = this.logout;
    // TODO: set hovers

    // Unlock any button only available when logged in
    const btnToEnable = document.querySelector('#clear-server-btn') || document.querySelector('#upload-btn');
    if (btnToEnable) {
      btnToEnable.disabled = false;
      btnToEnable.title = "";
    }

    // Lock any button only available when logged out
    const btnToDisable = document.querySelector('#clear-local-btn');
    if (btnToDisable) {
      btnToDisable.disabled = true;
      btnToDisable.title = "Must be logged out";
    }
  }

  login = async () => {
    // Get input values
    const userIn = this.userField.value;
    const passIn = this.passField.value;

    // Guard against empty inputs
    if (!userIn) {
      this.innerHTML = '<span class="has-text-danger">Please enter a username.</span>';
      this.userField.classList.add('is-danger');
      return;
    }
    this.userField.classList.remove('is-danger');
    if (!passIn) {
      this.innerHTML = '<span class="has-text-danger">Please enter a password.</span>';
      this.passField.classList.add('is-danger');
      return;
    }
    this.passField.classList.remove('is-danger');

    // Show loading
    this.loginSubmit.classList.add('is-loading');
    this.loginSubmit.disabled = true;
    this.userField.disabled = true;
    this.passField.disabled = true;

    try {
      // Send login request
      const response = await fetch("https://factorio-library.noahemke.com/api/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userIn, password: passIn })
      });

      if (response.ok) { // Server returned good login
        this.innerHTML = '<span class="has-text-primary">Success!</span>';

        // Set login data in storage
        const localState = getLocal();
        localState.user = userIn;
        localState.login = await response.json();
        localStorage.setItem('nre5152-p1-settings', JSON.stringify(localState));

        this.postLogin();

        // Refresh results
        const refreshBtn = document.querySelector('#search-btn') || document.querySelector('#refresh-btn');
        if (refreshBtn) {
          refreshBtn.onclick();
        }

        this.background.classList.add('hidden');
      } else {
        this.passField.classList.add('is-danger');
        this.userField.classList.add('is-danger');
        this.innerHTML = '<span class="has-text-danger">Invalid username or password.</span>';
        this.loginSubmit.disabled = false;
        this.userField.disabled = false;
        this.passField.disabled = false;
      }
    } catch (e) {
      this.innerHTML = '<span class="has-text-danger">Error connecting to server.</span>';
      this.loginSubmit.disabled = false;
      this.userField.disabled = false;
      this.passField.disabled = false;
    }
    this.loginSubmit.classList.remove('is-loading');
  }

  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.background = this.shadowRoot.querySelector('.popup');
    this.userField = this.shadowRoot.querySelector('#username-in');
    this.passField = this.shadowRoot.querySelector('#password-in');
    this.loginSubmit = this.shadowRoot.querySelector('#login-submit');
    this.loginBtn = this.shadowRoot.querySelector('#login-btn');
    this.loggedInAccount = this.shadowRoot.querySelector('#logged-in-account');

    // Hide login when clicking outside it
    this.background.onmousedown = (e) => {
      if (e.target == this.background) {
        this.background.classList.add('hidden');
      }
    }
  }

  connectedCallback() {
    // Login submit action
    this.loginSubmit.onclick = this.login;

    // Check if the user is already logged in
    if (getLocal().login) {
      if (getLocal().login.expires > Date.now()) {
        this.postLogin();
      } else {
        this.userField.value = getLocal().user;
        this.innerHTML = 'For your security, you have been logged out due to inactivity.';
        this.loginBtn.onclick = () => {
          this.background.classList.remove('hidden');
        };
      }
    } else {
      this.innerHTML = 'Login to save favorites across computers and upload your own blueprints.';
      this.loginBtn.onclick = () => {
        this.background.classList.remove('hidden');
      };
    }
  }

  disconnectedCallback() {
    this.loginSubmit.onclick = null;
  }
}

customElements.define('app-login', AppLogin);