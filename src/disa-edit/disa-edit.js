class DisaEdit extends Polymer.Element {
  
  static get is() { return 'disa-edit'; }

  static get properties() {
    return {
      entry: {
        type: Object
      },
      entryId: String,
      active: Boolean,
      saveResponse: {
        type: Object
      },
      options: {
        type: Array,
        notify: true
      }
    };
  }

  static get observers() {
    return [
      '__entryIdChanged(entryId)',
      '__entryChanged(entry)',
      'activeChanged(active)',
      '__saveResponse(saveResponse)'
    ]
  }

  constructor() {
    super();
  }
  
  connectedCallback() {
    super.connectedCallback();

    let self = this;
    this.$.form.addEventListener('iron-form-presubmit', function(e) {
      e.preventDefault();
      self.submitForm(this, e);
      return false;
    });
  }

  activeChanged(active) {
    if (active && !Utils.isSignedIn()) {
      alert("Please sign in.");
      window.history.pushState({}, null, '/#/');
      window.dispatchEvent(new CustomEvent('location-changed'));
      window.scrollTo(0,0);
      return;
    } else {
      this.$.form.reset();
      this.set('entryId', undefined);
    }
  }

  __entryIdChanged(entryId) {
    // trigger new ajax request
    if (entryId === undefined) {
      this.set('entry', new Entry());
    } else if (entryId === 'new') {
      this.set('entry', new Entry());
    } else {
      this.$.getAjax.generateRequest();
    }
  }

  __entryChanged(entry) {
    this.$.ai.shadowRoot.children[1].children["input-1"].shadowRoot.querySelector("textarea").dispatchEvent(new CustomEvent("bind-value-changed", {bubbles:true, composed:true}));
    this.$.rn.shadowRoot.children[1].children["input-2"].shadowRoot.querySelector("textarea").dispatchEvent(new CustomEvent("bind-value-changed", {bubbles:true, composed:true}));
    this.$.ai.shadowRoot.children[1].children["input-1"].shadowRoot.querySelector("textarea").dispatchEvent(new CustomEvent("blur", {bubbles:true, composed:true}));
    this.$.rn.shadowRoot.children[1].children["input-2"].shadowRoot.querySelector("textarea").dispatchEvent(new CustomEvent("blur", {bubbles:true, composed:true}));
    if (!entry) {
      alert("This is not a valid entry. If you got here from clicking on an entry on the dashboard, email Cole.");
      window.history.pushState({}, null, '/#/dashboard');
      window.dispatchEvent(new CustomEvent('location-changed'));
      window.scrollTo(0,0);
    }
  }

  __header(entryId, entry) {
    if (entryId == 'new') {
      return 'New Person';
    } else {
      return `This is DISA-${this.entry && this.entry.meta && this.entry.meta.idPrefix || ''}-${this.entry && this.entry.meta && this.entry.meta.idSuffix || ''}`;
    }
  }

  _toLocaleString(date) {
    return date && new Date(date).toLocaleString();
  }

  save() {
    for (let option of this.options) {
      this.dispatchEvent( 
        new CustomEvent('save-options', {
          bubble: true,
          composed: true,
          detail: {
            options: Object.values(option)[0],
            key: Object.keys(option)[0]
          }
        })
      );
    }
    this.__stageAction = 'save';
    this.prepareForm();
  }

  releaseToTeam() {
    this.__stageAction = 'releaseToTeam';
    this.prepareForm()
  }

  prepareForm() {
    this.$.spinnerContainer.style.display = "block";
    this.$.saveSpinner.active = true;
    this.$.saveSpinner.hidden = false;
    this.$.form.disabled = true;
    this.$.form.submit();
  }

  submitForm(form, e) {
    let body = new Entry();
    let formData = form.request.params;

    let person = this.$.person.createFromData(formData);
    body.person = person;
    this.$.person.resetDropdown();

    let owner = this.$.person.$.owner.createFromData(formData);
    body.owner = owner;

    let [dateOfRunaway, dateOfEmancipation, buyer, seller, dateOfSale, dateOfMarriage, dateOfDeath] = this.$.misc.createFromData(formData);
    body.dateOfRunaway = dateOfRunaway;
    body.dateOfEmancipation = dateOfEmancipation;
    body.dateOfSale = dateOfSale;
    body.dateOfMarriage = dateOfMarriage;
    body.dateOfDeath = dateOfDeath;
    body.buyer = buyer;
    body.seller = seller;

    let document = this.$.document.createFromData(formData);
    body.document = document;

    let additionalInformation = formData['additionalInformation'];
    body.additionalInformation = additionalInformation;

    let researcherNotes = formData['researcherNotes'];
    body.researcherNotes = researcherNotes;

    // body.meta = self.entry && self.entry.meta || {};
    let meta = new Meta();
    meta.lastModified = new Date();
    // body.meta.updatedBy = this.userId;
    if (this.entry.meta.stage) {
      if (this.__stageAction == 'save') {
        meta.stage = this.entry.meta.stage;
      } else {
        if (this.entry.meta.stage === 'Public') {
          meta.stage = 'Public';
        } else {
          meta.stage = 'Internal';
        }
      }
    } else {
      this.__stageAction === 'save' ? meta.stage = 'Draft' : meta.stage = 'Internal';
    }
    if (this.entryId != 'new') {
      meta.idPrefix = this.entry.meta.idPrefix;
      meta.idSuffix = this.entry.meta.idSuffix;
    }
    // body.meta.creator = body.meta.creator || localStorage.getItem("id");
    // if (self.entryId != 'new') {
    //   body._id = self.entryId;
    // }
    body.meta = meta;

    console.log(body)

    this.setProperties({
      saveBody: body,
      saveMethod: this.entryId == 'new' ? 'POST' : 'PUT',
      saveUrl: this.entryId == 'new' ? `${this.apiHost}/entries` : `${this.apiHost}/entries/${this.entryId}`
    });

    // this.set('entry', new Entry());

    this.$.saveAjax.generateRequest();
  }

  __saveResponse(saveResponse) {
    this.$.spinnerContainer.style.display = "none";
    this.$.saveSpinner.active = false;
    this.$.saveSpinner.hidden = true;
    this.$.form.disabled = false;
    if (typeof saveResponse === 'undefined') {
      return;
    }
    if (saveResponse && (saveResponse.status == 200 || saveResponse.status == 201 || saveResponse.status == 204)) {
      this.$.form.reset();
      this.set('entryId', undefined);
      this.cancel();
      this.dispatchEvent(new CustomEvent('reload-needed', {
        bubbles: true,
        composed: true
      }));
    } else {
      alert("There was an error. Please try again.");
    }
    this.set('saveResponse', undefined);
  }

  cancel() {
    window.history.pushState({}, null, '/#/dashboard');
    window.dispatchEvent(new CustomEvent('location-changed'));
    window.scrollTo(0,0);
  }
}

window.customElements.define(DisaEdit.is, DisaEdit);
