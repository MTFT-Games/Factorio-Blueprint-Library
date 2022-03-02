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

.title {
    font-size: 1.4rem;
}

div.body {
    box-sizing: content-box;
    width: 10em;
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
	<span class="title p-2"></span>
	<div class="body panel-inset panel-inset-lighter mt-1 p-2 has-text-light">
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
                this.div.innerHTML = '<img class="base-icon" src="images/blueprint.png">';
            } else {
                this.div.innerHTML = '<img class="base-icon" src="images/book.png">';
            }
            this.div.innerHTML += `<span class="author">${this.item.author}</span> <i class="favorite-btn fa-regular fa-bookmark"></i>`;
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