import { getLocal } from "./utils.js";

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" 
  href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
<link rel="stylesheet" 
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" 
  integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg==" 
  crossorigin="anonymous" referrerpolicy="no-referrer" />
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
  <factorio-panel-light id="login-pane">
		<span slot="title">Login or <button id="create-btn" class="button is-warning">Create account</button></span>
		<div slot="content">
			<p class="has-text-light is-size-6 has-text-weight-normal"><slot></slot></p>
			<input type="text" class="input" id="username-in" placeholder="Username">
			<input type="password" class="input" id="password-in" placeholder="Password">
			<button id="login-submit" class="button is-primary">Login</button>
		</div>
	</factorio-panel-light>
	<factorio-panel-light id="create-pane" class="hidden">
		<span slot="title">Create an account or <button id="back-login-btn" class="button is-warning">Login</button></span>
		<div slot="content">
			<p id="create-msg" class="has-text-light is-size-6 has-text-weight-normal">Create a new Factorio Blueprint Library account.</p>
			<input type="text" class="input" id="create-username-in" placeholder="Username">
			<input type="password" class="input" id="create-password-in" placeholder="Password">
      <input type="text" class="input" id="create-email-in" placeholder="Email">
			<button id="create-submit" class="button is-primary">Create account</button>
		</div>
	</factorio-panel-light>
  <factorio-panel-light id="verify-pane" class="hidden">
		<span slot="title">Verify your email</span>
		<div slot="content">
			<p id="verify-msg" class="has-text-light is-size-6 has-text-weight-normal">Verify your email to finish creating the account. A code has been sent to your email, please enter it below.</p>
			<input type="text" class="input" id="verify-code-in" placeholder="Code">
			<button id="verify-submit" class="button is-primary">Verify Email</button>
      <button id="back-create-btn" class="button is-warning">Back to creation</button>
		</div>
	</factorio-panel-light>
</div>
`;

class AppLogin extends HTMLElement {
  logout = () => {
    this.innerHTML = 'Login to save favorites across computers and upload your own blueprints.';

    // Unset login data in storage
    const localState = getLocal();
    localState.login = null;
    localStorage.setItem('nre5152-p1-settings', JSON.stringify(localState));

    // Set login indicator
    this.loggedInAccount.innerHTML = 'Log in';
    this.loginBtn.classList.remove('is-primary');
    this.loginBtn.classList.add('is-warning');
    this.loginBtn.onclick = () => {
      this.background.classList.remove('hidden');
    };
    // TODO: set hovers

    // Lock any button only available when logged in
    const btnToDisable = document.querySelector('#clear-server-btn') || document.querySelector('#upload-btn');
    if (btnToDisable) {
      btnToDisable.disabled = true;
      btnToDisable.title = "Must be logged in";
    }

    // Unlock any button only available when logged out
    const btnToEnable = document.querySelector('#clear-local-btn');
    if (btnToEnable) {
      btnToEnable.disabled = false;
      btnToEnable.title = "";
    }

    // Refresh results
    const refreshBtn = document.querySelector('#search-btn') || document.querySelector('#refresh-btn');
    if (refreshBtn) {
      refreshBtn.onclick();
    }
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
      const response = await fetch("/api/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userIn, password: passIn })
      });

      if (response.ok) { // Server returned good login
        this.innerHTML = '<span class="has-text-primary">Success!</span>';
        this.userField.classList.remove('is-danger');
        this.passField.classList.remove('is-danger');

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
      }
    } catch (e) {
      this.innerHTML = '<span class="has-text-danger">Error connecting to server.</span>';
    }
    this.loginSubmit.disabled = false;
    this.userField.disabled = false;
    this.passField.disabled = false;
    this.passField.value = '';
    this.loginSubmit.classList.remove('is-loading');
  }

  create = async () => {
    // Get input values
    const userIn = this.createUserField.value;
    const passIn = this.createPassField.value;
    const mailIn = this.createEmailField.value;

    // Guard against empty inputs
    if (!userIn) {
      this.createMsg.innerHTML = '<span class="has-text-danger">Please enter a username.</span>';
      this.createUserField.classList.add('is-danger');
      return;
    }
    this.createUserField.classList.remove('is-danger');
    if (!passIn) {
      this.createMsg.innerHTML = '<span class="has-text-danger">Please enter a password.</span>';
      this.createPassField.classList.add('is-danger');
      return;
    }
    this.createPassField.classList.remove('is-danger');
    if (!mailIn) {
      this.createMsg.innerHTML = '<span class="has-text-danger">Please enter an email.</span>';
      this.createEmailField.classList.add('is-danger');
      return;
    }
    this.createEmailField.classList.remove('is-danger');

    // Show loading
    this.createSubmitBtn.classList.add('is-loading');
    this.createSubmitBtn.disabled = true;
    this.createUserField.disabled = true;
    this.createPassField.disabled = true;
    this.createEmailField.disabled = true;

    try {
      // Send login request
      const response = await fetch("/api/login/verify", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userIn, email: mailIn })
      });

      if (response.ok) {
        this.createMsg.innerHTML = 'Create a new Factorio Blueprint Library account.';
        this.createUserField.classList.remove('is-danger');
        this.createPassField.classList.remove('is-danger');
        this.createEmailField.classList.remove('is-danger');

        this.code = await response.text();

        this.createPane.classList.add('hidden');
        this.verifyPane.classList.remove('hidden');
      } else {
        const error = await response.json();

        this.createMsg.innerHTML = `<span class="has-text-danger">${error.message}</span>`;
      }
    } catch (e) {
      this.createMsg.innerHTML = '<span class="has-text-danger">Error connecting to server.</span>';
      throw(e);
    }

    this.createSubmitBtn.classList.remove('is-loading');
    this.createSubmitBtn.disabled = false;
    this.createUserField.disabled = false;
    this.createPassField.disabled = false;
    this.createEmailField.disabled = false;
  }

  verify = async () => {
    // Get input values
    const codeIn = this.verifyCodeField.value;

    // Guard against empty inputs
    if (codeIn != this.code) {
      this.verifyMsg.innerHTML = '<span class="has-text-danger">Please enter the correct code.</span>';
      this.verifyCodeField.classList.add('is-danger');
      return;
    }
    this.verifyCodeField.classList.remove('is-danger');


    // Show loading
    this.verifySubmitBtn.classList.add('is-loading');
    this.verifySubmitBtn.disabled = true;
    this.verifyCodeField.disabled = true;

    try {
      // Send login request
      const response = await fetch("/api/login/new", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.createUserField.value, password: this.createPassField.value, email: this.createEmailField.value })
      });

      if (response.ok) {
        this.verifyMsg.innerHTML = 'Verify your email to finish creating the account. A code has been sent to your email, please enter it below.';
        this.verifyCodeField.classList.remove('is-danger');

        this.code = null;

        // Set login data in storage
        const localState = getLocal();
        localState.user = this.createUserField.value;
        localState.login = await response.json();
        localStorage.setItem('nre5152-p1-settings', JSON.stringify(localState));

        this.createPassField.value = '';
        this.createUserField.value = '';
        this.createEmailField.value = '';
        this.verifyCodeField.value = '';

        this.postLogin();

        this.loginPane.classList.remove('hidden');
        this.verifyPane.classList.add('hidden');

        // Refresh results
        const refreshBtn = document.querySelector('#search-btn') || document.querySelector('#refresh-btn');
        if (refreshBtn) {
          refreshBtn.onclick();
        }

        this.background.classList.add('hidden');
      } else {
        const error = await response.json();

        this.verifyMsg.innerHTML = `<span class="has-text-danger">${error.message}</span>`;
      }
    } catch (e) {
      this.createMsg.innerHTML = '<span class="has-text-danger">Error connecting to server.</span>';
    }

    this.verifySubmitBtn.classList.remove('is-loading');
    this.verifySubmitBtn.disabled = false;
    this.verifyCodeField.disabled = false;
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
    this.createBtn = this.shadowRoot.querySelector('#create-btn');
    this.backLoginBtn = this.shadowRoot.querySelector('#back-login-btn');
    this.createMsg = this.shadowRoot.querySelector('#create-msg');
    this.createUserField = this.shadowRoot.querySelector('#create-username-in');
    this.createPassField = this.shadowRoot.querySelector('#create-password-in');
    this.createEmailField = this.shadowRoot.querySelector('#create-email-in');
    this.createSubmitBtn = this.shadowRoot.querySelector('#create-submit');
    this.createPane = this.shadowRoot.querySelector('#create-pane');
    this.verifyPane = this.shadowRoot.querySelector('#verify-pane');
    this.loginPane = this.shadowRoot.querySelector('#login-pane');
    this.verifyMsg = this.shadowRoot.querySelector('#verify-msg');
    this.verifyCodeField = this.shadowRoot.querySelector('#verify-code-in');
    this.verifySubmitBtn = this.shadowRoot.querySelector('#verify-submit');
    this.backCreateBtn = this.shadowRoot.querySelector('#back-create-btn');
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

    this.createBtn.onclick = () => {
      this.loginPane.classList.add('hidden');
      this.createPane.classList.remove('hidden');
    };

    this.backLoginBtn.onclick = () => {
      this.loginPane.classList.remove('hidden');
      this.createPane.classList.add('hidden');
    };

    this.createSubmitBtn.onclick = this.create;
    this.verifySubmitBtn.onclick = this.verify;

    this.backCreateBtn.onclick = () => {
      this.verifyMsg.innerHTML = 'Verify your email to finish creating the account. A code has been sent to your email, please enter it below.';
      this.verifyCodeField.classList.remove('is-danger');
      this.verifyCodeField.value = '';
      this.createPane.classList.remove('hidden');
      this.verifyPane.classList.add('hidden');
    };

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