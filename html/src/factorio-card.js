const template = document.createElement("template");
template.innerHTML = `
<link rel="stylesheet"
	href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<style>
.fpanel {
    background-color: #e4cead;
    box-shadow: inset 3px 0 2px -2px #201815,inset 0 3px 2px -2px #8f8c8b,inset -3px 0 2px -2px #201815,inset 0 -3px 3px -3px #000,0 0 3px 0 #201815;
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

div.fpanel {
    width: 13em;
}

div.body {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1em;
    grid-template-rows: 1fr 1.5em;
}

span.author {
    grid-row: 2 / 3;
    grid-column: 1 / 2;
}

.favorite-btn {
    grid-row: 2 / 3;
    grid-column: 2 / 3;
    line-height: 1.5em;
}

.base-icon {
    width: 100%;
    grid-row: 1 / 2;
    grid-column: 1 / -1;
}
</style>
<div class="fpanel m-3">
	<span class="title p-2 mb-2"></span>
	<div class="body panel-inset panel-inset-lighter mt-1 p-2 has-text-light">
        <img class="base-icon" src="">
        <span class="author"></span>
        <i class="favorite-btn fa-regular fa-bookmark"></i>
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
        this.favBtn.onclick = () => {
            let settings = JSON.parse(localStorage.getItem('nre5152-p1-settings'));
            if (this.dataset.favorited == 'true') {
                this.dataset.favorited = false;
                if (settings.login && settings.login.expires > Date.now()) {
                    // remove from favs in server
                } else {
                    settings.favorites.splice(settings.favorites.indexOf(this.dataset.id), 1);
                    localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));
                }
            } else {
                this.dataset.favorited = true;
                if (settings.login && settings.login.expires > Date.now()) {
                    // add to favs in server
                } else {
                    settings.favorites.push(this.dataset.id);
                    localStorage.setItem('nre5152-p1-settings', JSON.stringify(settings));
                }
            }
            this.render();
        };
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (this._item) {
            let type = this.item.type;
            if (this.item.content[type].label) {
                this.span.innerHTML = this.item.content[type].label;
            } else {
                this.span.innerHTML = "Unnamed";
            }
            if (this.item.type == "blueprint") {
                this.shadowRoot.querySelector(".base-icon").src = "images/blueprint.png";
            } else {
                this.shadowRoot.querySelector(".base-icon").src = "images/book.png";
            }
            this.shadowRoot.querySelector(".author").innerHTML = this.item.author;
            if (this.dataset.favorited == 'true') {
                this.favBtn.classList.remove('fa-regular');
                this.favBtn.classList.add('fa-solid');
            } else {
                this.favBtn.classList.add('fa-regular');
                this.favBtn.classList.remove('fa-solid');
            }
        }

        // TODO: Parse object and display useful bits
        // set data-id to the id of the item
        // check for a data-favorited to color the favorite button and determine action
        // script that creates these will add favorited tags to those with a matching id in the favorites
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

    // TODO: ADD HOVER
}

customElements.define('factorio-card', FactorioCard);