const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
<style>
.fpanel {
    background-color: #313031;
    box-shadow: inset 3px 0 2px -2px #201815,inset 0 3px 2px -2px #8f8c8b,inset -3px 0 2px -2px #201815,inset 0 -3px 3px -3px #000,0 0 3px 0 #201815;
}
.panel-inset {
    box-shadow: inset 0 0 3px 0 #000,0 -2px 2px -1px #000,-2px 0 2px -2px #0f0d0c,2px 0 2px -2px #0f0d0c,0 2px 2px -2px #ebe6e4;
    background-color: #242324;
}
</style>
<div class="fpanel p-2 m-3">
	<span class="title has-text-light"><slot name="title"></slot></span>
	<div class="panel-inset mt-2 p-2">
		<slot name="content"></slot>
	</div>
</div>
`;

class FactorioPanel extends HTMLElement {
	constructor() {
		super();

		this.attachShadow({ mode: "open" });
		this.shadowRoot.appendChild(template.content.cloneNode(true));
	}
}

customElements.define('factorio-panel', FactorioPanel);