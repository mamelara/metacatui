define(['underscore',
        'jquery',
        'backbone',
        'models/portals/PortalModel',
        'models/portals/PortalSectionModel',
        "views/portals/editor/PortEditorSectionView",
        "views/portals/editor/PortEditorSettingsView",
        "views/portals/editor/PortEditorDataView",
        "views/portals/editor/PortEditorMdSectionView",
        "text!templates/portals/editor/portEditorSections.html",
        "text!templates/portals/editor/portEditorMetrics.html",
        "text!templates/portals/editor/portEditorSectionLink.html",
        "text!templates/portals/editor/portEditorSectionOptionImgs/metrics.svg"],
function(_, $, Backbone, Portal, PortalSection,
          PortEditorSectionView, PortEditorSettingsView, PortEditorDataView,
          PortEditorMdSectionView,
          Template, MetricsSectionTemplate, SectionLinkTemplate,
          MetricsSVG){

  /**
  * @class PortEditorSectionsView
  * @classdesc A view of one or more Portal Editor sections
  * @extends Backbone.View
  * @constructor
  */
  var PortEditorSectionsView = Backbone.View.extend(
    /** @lends PortEditorSectionsView.prototype */{

    /**
    * The type of View this is
    * @type {string}
    */
    type: "PortEditorSections",

    /**
    * The HTML tag name for this view's element
    * @type {string}
    */
    tagName: "div",

    /**
    * The HTML classes to use for this view's element
    * @type {string}
    */
    className: "port-editor-sections",

    /**
    * The PortalModel that is being edited
    * @type {Portal}
    */
    model: undefined,

    /**
    * A reference to the currently active editor section. e.g. Data, Metrics, Settings, etc.
    * @type {PortEditorSectionView}
    */
    activeSection: undefined,

    /**
    * The name of the active section when the view is first loaded. This is retrieved from the router/URL
    * @type {string}
    */
    activeSectionLabel: undefined,

    /**
    * The unique labels for each section in this Portal
    * @type {string[]}
    */
    sectionLabels: [],

    /**
    * The subviews contained within this view to be removed with onClose
    * @type {Array}
    */
    subviews: new Array(),

    /**
    * A reference to the PortalEditorView
    * @type {PortalEditorView}
    */
    editorView: undefined,

    /**
    * References to templates for this view. HTML files are converted to Underscore.js templates
    */
    /**
    @type {Underscore.Template}
    */
    template: _.template(Template),
    /**
    @type {Underscore.Template}
    */
    sectionLinkTemplate: _.template(SectionLinkTemplate),
    /**
    @type {Underscore.Template}
    */
    metricsSectionTemplate: _.template(MetricsSectionTemplate),

    /**
    * A jQuery selector for the elements that are links to the individual sections
    * @type {string}
    */
    sectionLinks: ".portal-section-link",
    /**
    * A jQuery selector for the element that the section links should be inserted into
    * @type {string}
    */
    sectionLinksContainer: ".section-links-container",
    /**
    * A jQuery selector for the element that a single section link will be inserted into
    * @type {string}
    */
    sectionLinkContainer: ".section-link-container",
    /**
    * A jQuery selector for the element that the editor sections should be inserted into
    * @type {string}
    */
    sectionsContainer: ".sections-container",
    /**
    * A jQuery selector for the section elements
    * @type {string}
    */
    sectionEls: ".port-editor-section",

    /**
    * Flag to add section name to URL. Enabled by default.
    * @type {boolean}
    */
    displaySectionInUrl: true,

    /**
    * @borrows PortalEditorView.newPortalTempName as newPortalTempName
    */
    newPortalTempName: "",

    /**
    * The events this view will listen to and the associated function to call.
    * @type {Object}
    */
    events: {
      "click .rename-section" : "renameSection",
      "dblclick .portal-section-link": "renameSection",
      "click .show-section"   : "showSection",
      "click .portal-section-link"   : "handleSwitchSection",
      "focusout .portal-section-link[contenteditable=true]" : "updateName",
      "click .cancelled-section-removal" : "closePopovers",
      "click .confirmed-section-removal" : "removeSection",
      // both keyup and keydown events are needed for limitLabelLength function
      "keyup .portal-section-link[contenteditable=true]"    : "limitLabelInput",
      "keydown .portal-section-link[contenteditable=true]"  : "limitLabelInput",
      "click #link-to-data"                                 :  "navigateToData"
    },

    /**
    * Creates a new PortEditorSectionsView
    * @constructs PortEditorSectionsView
    * @param {Object} options - A literal object with options to pass to the view
    */
    initialize: function(options){
      // Get all the options and apply them to this view
      if (options) {
          var optionKeys = Object.keys(options);
          _.each(optionKeys, function(key, i) {
              this[key] = options[key];
          }, this);
      }
    },

    /**
    * Renders the PortEditorSectionsView
    */
    render: function(){

      //Insert the template into the view
      this.$el.html(this.template());

      //Render the Data section
      this.renderDataSection();

      //Render the Metrics section
      this.renderMetricsSection();

      //Render the Add Section tab
      this.renderAddSection();

      //Render the Settings
      this.renderSettings();

      //Render a Section View for each content section in the Portal
      this.renderContentSections();

      //Switch to the active section, if there is one
      if( this.activeSectionLabel ){
        this.activeSection = this.getSectionByLabel(this.activeSectionLabel);

        //Switch to the active section
        this.switchSection(this.activeSection);

        //Reset the active section label, since it is only used during the initial rendering
        this.activeSectionLabel = undefined;

      }
      else{
        //Switch to the default section
        this.switchSection();
      }

      // Disable the delete/hide section option if there is only one section
      this.toggleRemoveSectionOption();

    },

    /**
    * Render a section for adding a new section
    */
    renderAddSection: function(){

      //Create a unique label for this section and save it
      if( !this.sectionLabels ){
        this.sectionLabels = [];
        this.sectionLabels.push("AddPage");
      }
      else if( this.sectionLabels && Array.isArray(this.sectionLabels) ){
        this.sectionLabels.push("AddPage");
      }

      // Add a "Add section" button/tab
      var addSectionView = new PortEditorSectionView({
        model: this.model,
        uniqueSectionLabel: "AddPage",
        sectionType: "addpage"
      });

      addSectionView.$el.addClass("tab-pane")
        .addClass("port-editor-add-section-container")
        .attr("id", "AddPage");

      //Add the section element to this view
      this.$(this.sectionsContainer).append(addSectionView.$el);

      //Render the section view
      addSectionView.render();

      // Add the tab to the tab navigation
      this.addSectionLink(addSectionView);

      // Replace the name "AddSection" with fontawsome "+" icon
      this.$el.find( this.sectionLinkContainer + "[data-section-name='AddPage'] a")
              .html("<i class='icon icon-plus'></i>")
              .attr("title", "Add a new page");

      // When a sectionOption is clicked in the addSectionView subview,
      // the "addNewSection" event is triggered.
      this.listenTo(addSectionView, "addNewSection", this.addSection);

      //Add the view to the subviews array
      this.subviews.push(addSectionView);

    },

    /**
    * Render all sections in the editor for each content section in the Portal
    */
    renderContentSections: function(){

      //Get the sections from the Portal
      var sections = this.model.get("sections");

      // Render each markdown (aka "freeform") section already in the PortalModel
      _.each(sections, function(section){


        try{
          if(section){
            //Render the content section
            this.renderContentSection(section);
          }
        }
        catch(e){
          console.error(e);
        }
      }, this);

    },

    /**
    * Render a single markdown section in the editor (sectionView + link)
    * @param {PortalSectionModel} section - The section to render
    * @param {boolean} isNew - If true, this section will be rendered as a section that was just added by the user
    */
    renderContentSection: function(section, isNew){

      try{

        if( typeof isNew == "undefined" || isNew == null) {
          var isNew = false;
        }

        if(section){

          // Create and render and markdown section view
          var sectionView = new PortEditorMdSectionView({
            model: section
          });

          // Pass the portal editor view onto the section
          sectionView.editorView = this.editorView;

          //Create a unique label for this section and save it
          var uniqueLabel = this.getUniqueSectionLabel(section);
          //Set the unique section label for this view
          sectionView.uniqueSectionLabel = uniqueLabel;

          if( this.sectionLabels && Array.isArray(this.sectionLabels) ){
            this.sectionLabels.push(uniqueLabel);
          }
          else{
            //Create an array to contain the section labels and save this label
            this.sectionLabels = [];
            this.sectionLabels.push(uniqueLabel);
          }

          //When the section is renamed, update the array of section labels
          this.listenTo( section, "change:label", function(section){
            //Get the position of the unique label in the list
            var indexOfLabel = this.sectionLabels.indexOf(sectionView.uniqueSectionLabel),
                newUniqueLabel = "";

            if( indexOfLabel > -1 ){
              //Replace the old unique label with a temporary label, so when a new unique label is created,
              // we don't consider a label that's not in use
              this.sectionLabels[indexOfLabel] = "temporarylabeltobereplaced";

              //Get a new unique label using the new label on the section model
              newUniqueLabel = this.getUniqueSectionLabel(section);

              //Replace the temporary label with the new label
              this.sectionLabels[indexOfLabel] = newUniqueLabel;
            }
            else{
              //Get a new unique label using the new label on the section model
              newUniqueLabel = this.getUniqueSectionLabel(section);
              //Add the label to the list
              this.sectionLabels.push(newUniqueLabel);
            }

            //Update the label set on the view
            sectionView.uniqueSectionLabel = newUniqueLabel;
          });

          //Attach the editor view to this view
          sectionView.editorView = this.editorView;

          sectionView.$el.attr("id", uniqueLabel);

          //Insert the PortEditorMdSectionView element into this view
          this.$(this.sectionsContainer).append(sectionView.$el);

          //Render the PortEditorMdSectionView
          sectionView.render();

          // Add the tab to the tab navigation
          this.addSectionLink(sectionView, ["Rename", "Delete"], isNew);

          // Add the sections to the list of subviews
          this.subviews.push(sectionView);

        }
      }
      catch(e){
        console.error(e);
      }

    },

    /**
    * Renders a Data section in this view
    */
    renderDataSection: function(){

      try{

        //Create a unique label for this section and save it
        if( !this.sectionLabels ){
          this.sectionLabels = [];
          this.sectionLabels.push("Data");
        }
        else if( Array.isArray(this.sectionLabels) && !this.sectionLabels.includes("Data") ){
          this.sectionLabels.push("Data");
        }

        // Render a PortEditorDataView and corresponding tab
        var dataView = new PortEditorDataView({
          model: this.model,
          uniqueSectionLabel: "Data"
        });

        //Save a reference to this view
        this.dataView = dataView;

        //Add the view to the page
        this.$(this.sectionsContainer).append(dataView.el);

        //Render the PortEditorDataView
        dataView.render();

        //Create the menu options for the Data section link
        var menuOptions = [];
        if( this.model.get("hideData") === true ){
          menuOptions.push("Show");
        }
        else{
          menuOptions.push("Hide");
        }

        // Add the tab to the tab navigation
        this.addSectionLink(dataView, menuOptions);

        //When the Data section has been hidden or shown, update the section link
        this.stopListening(this.model, "change:hideData");
        this.listenTo(this.model, "change:hideData", function(){
          //Create the menu options for the Data section link
          var menuOptions = [];
          if( this.model.get("hideData") === true ){
            menuOptions.push("Show");
          }
          else{
            menuOptions.push("Hide");
          }

          this.updateSectionLink(dataView, menuOptions);
        });

        // Add the data section to the list of subviews
        this.subviews.push(dataView);
      }
      catch(e){
        console.error(e);
      }
    },

    /**
    * Renders the Metrics section of the editor
    */
    renderMetricsSection: function(){

      // Render a PortEditorSectionView for the Metrics section if metrics is set
      // to show, and the view hasn't already been rendered.
      if(this.model.get("hideMetrics") !== true && !this.metricsView){

        //Create a unique label for this section and save it
        if( !this.sectionLabels ){
          this.sectionLabels = [];
          this.sectionLabels.push("Metrics");
        }
        else if( Array.isArray(this.sectionLabels) && !this.sectionLabels.includes("Metrics") ){
          this.sectionLabels.push("Metrics");
        }

        //Create a section view
        this.metricsView = new PortEditorSectionView({
          model: this.model,
          uniqueSectionLabel: "Metrics",
          template: this.metricsSectionTemplate,
          sectionType: "metrics"
        });

        this.metricsView.$el.attr("id", "Metrics");
        this.$(this.sectionsContainer).append(this.metricsView.el);

        //Render the view
        this.metricsView.render();

        // Insert the metrics illustration
        $(this.metricsView.el).find(".metrics-figure-container").html(MetricsSVG);

        // Add the data section to the list of subviews
        this.subviews.push(this.metricsView);

      }
      //If the metrics aren't hidden AND the metrics view was created already, then show it
      else if( this.model.get("hideMetrics") !== true && this.metricsView ){

        this.$(this.sectionsContainer).append(this.metricsView.$el);
        this.metricsView.$el.data({
          view: this.metricsView,
          model: this.model
        })

      }

      //When the metrics section has been toggled, remove or add the link
      this.toggleMetricsLink();

    },


    /**
     * navigateToData - Navigate to the data tab.
     */
    navigateToData: function(){
      if(this.dataView){
        this.switchSection(this.dataView);
      }
    },

    /**
    * Adds or removes the metrics link depending on the 'hideMetrics' option in
    * the model.
    */
    toggleMetricsLink: function(){

      try{
        // Need a metrics view to exist already if metrics is set to show
      /*  if(!this.metricsView && !this.model.get("hideMetrics") === true){
          this.renderMetricsSection();
        }*/
        //If hideMetrics has been set to true, remove the link
        if( this.model.get("hideMetrics") === true ){
          this.removeSectionLink(this.metricsView);
        // Otherwise add it
        } else {
          this.addSectionLink(this.metricsView, ["Delete"]);
        }
      }
      catch(e){
        console.error(e);
      }
    },

    /**
    * Renders the Settings section of the editor
    */
    renderSettings: function(){

      //Create a unique label for this section and save it
      if( !this.sectionLabels ){
        this.sectionLabels = [];
        this.sectionLabels.push("Settings");
      }
      else if( this.sectionLabels && Array.isArray(this.sectionLabels) ){
        this.sectionLabels.push("Settings");
      }

      //Create a PortEditorSettingsView
      var settingsView = new PortEditorSettingsView({
        model: this.model,
        uniqueSectionLabel: "Settings"
      });

      settingsView.editorView = this.editorView;

      //Add the Settings view to the page
      this.$(this.sectionsContainer).append(settingsView.$el);

      //Render the PortEditorSettingsView
      settingsView.render();

      //Create and add a section link
      this.addSectionLink(settingsView);

      // Add the data section to the list of subviews
      this.subviews.push(settingsView);

    },

    /**
     * Update the window location path with the active section name
     * @param {boolean} [showSectionLabel] - If true, the section label will be added to the path
    */
    updatePath: function(showSectionLabel){

      var label         = this.model.get("label") || this.newPortalTempName,
          originalLabel = this.model.get("originalLabel") || this.newPortalTempName,
          pathName      = decodeURIComponent(window.location.pathname)
                          .substring(MetacatUI.root.length)
                          // remove trailing forward slash if one exists in path
                          .replace(/\/$/, "");

      // Add or replace the label and section part of the path with updated values.
      // pathRE matches "/label/section", where the "/section" part is optional
      var pathRE = new RegExp("\\/(" + label + "|" + originalLabel + ")(\\/[^\\/]*)?$", "i");
      newPathName = pathName.replace(pathRE, "") + "/" + label;

      if( showSectionLabel && this.activeSection ){
        newPathName += "/" + this.activeSection.uniqueSectionLabel;
      }

      // Update the window location
      MetacatUI.uiRouter.navigate( newPathName, { trigger: false } );

    },

    /**
    * Returns the section view that has a label matching the one given.
    * @param {string} label - The label for the section
    * @return {PortEditorSectionView|false} - Returns false if a matching section view isn't found
    */
    getSectionByLabel: function(label){

      //If no label is given, exit
      if(!label){
        return;
      }

      //Find the section view whose unique label matches the given label. Case-insensitive matching.
      return _.find( this.subviews, function(view){
        if( typeof view.uniqueSectionLabel == "string" ){
          return view.uniqueSectionLabel.toLowerCase() == label.toLowerCase();
        }
        else{
          return false;
        }
      });
    },

    /**
    * Returns the section view that has a label matching the one given.
    * @param {PortalSectionModel} section - The section model
    * @return {PortEditorSectionView|false} - Returns false if a matching section view isn't found
    */
    getSectionByModel: function(section){

      //If no section is given, exit
      if(!section){
        return;
      }

      //Find the section view whose unique label matches the given label. Case-insensitive matching.
      return _.findWhere( this.subviews, { model: section });
    },

    /**
    * Creates and returns a unique label for the given section. This label is just used in the view,
    * because portal sections can have duplicate labels. But unique labels need to be used for navigation in the view.
    * @param {PortEditorSection} sectionModel - The section for which to create a unique label
    * @return {string} The unique label string
    */
    getUniqueSectionLabel: function(sectionModel){
      //Get the label for this section
      var sectionLabel = sectionModel.get("label").replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g, "-"),
          unalteredLabel = sectionLabel,
          sectionLabels = this.sectionLabels || [],
          i = 2;

      //Concatenate a number to the label if this one already exists
      while( sectionLabels.includes(sectionLabel) ){
        sectionLabel = unalteredLabel + i;
        i++;
      }

      return sectionLabel;
    },

    /**
    * Manually switch to a section subview by making the tab and tab panel active.
    * Navigation between sections is usually handled automatically by the Bootstrap
    * library, but a manual switch may be necessary sometimes
    * @param {PortEditorSectionView} [sectionView] - The section view to switch to. If not given, defaults to the activeSection set on the view.
    */
    switchSection: function(sectionView){

      //Create a flag for whether the section label should be shown in the URL
      var showSectionLabelInURL = true;

      // If no section view is given, use the active section in the view.
      if( !sectionView ){
        //Use the sectionView set already
        if( this.activeSection ){
          var sectionView = this.activeSection;
        }
        //Or find the section view by name, which may have been passed through the URL
        else if( this.activeSectionLabel ){
          var sectionView = this.getSectionByLabel(this.activeSectionLabel);
        }
      }

      //If no section view was indicated, just default to the first visible one
      if( !sectionView ){
        var sectionView = this.$(this.sectionLinkContainer + ":not(.removing)").first().data("view");

        //If we are defaulting to the first section, don't show the section label in the URL
        showSectionLabelInURL = false;

        //If there are no section views on the page at all, exit now
        if( !sectionView ){
          return;
        }
      }

      // Update the activeSection set on the view
      this.activeSection = sectionView;

      // Activate the section content
      this.$(this.sectionEls).each(function(i, contentEl){
        if($(contentEl).data("view") == sectionView){
          $(contentEl).addClass("active");
          sectionView.trigger("active");
        } else {
          // make sure no other sections are active
          $(contentEl).removeClass("active");
        }
      });

      // Activate the link to the content
      this.$(this.sectionLinkContainer).each(function(i, linkEl){
        if( $(linkEl).data("view") == sectionView ){
          $(linkEl).addClass("active")
        } else {
          // make sure no other sections are active
          $(linkEl).removeClass("active")
        };
      });

      //Update the location path with the new section name
      this.updatePath(showSectionLabelInURL);

    },

    /**
    * When a section link has been clicked, switch to that section
    * @param {Event} e - The click event on the section link
    */
    handleSwitchSection: function(e){

      e.preventDefault();

      var sectionView = $(e.target).parents(this.sectionLinkContainer).first().data("view");

      if( sectionView ){
        this.switchSection(sectionView);
        // If the user clicks a link and is not near the top of the page
        // (i.e. on mobile), scroll to the top of the section content.
        // Otherwise it might look like the page hasn't changed
        if(window.pageYOffset > $("#editor-body").offset().top){
          MetacatUI.appView.scrollTo($("#editor-body"));
        }
      }

    },

    /**
    * Add a link to the given editor section
    * @param {PortEditorSectionView} sectionView - The view to add a link to
    * @param {string[]} menuOptions - An array of menu options for this section. e.g. Rename, Delete
    * @param {boolean} isFocused - A boolean flag to enable focus on new section link
    */
    addSectionLink: function(sectionView, menuOptions, isFocused){

      if( typeof isFocused != "boolean") {
        var isFocused = false;
      }

      try{
        var newLink = this.createSectionLink(sectionView, menuOptions);

        // Make the tab hidden to start
        $(newLink)
          .find(this.sectionLinks)
          .css('max-width','0px')
          .css('opacity','0.2')
          .css('white-space', 'nowrap');

        $(newLink)
          .find(".section-menu-link")
          .css('opacity','0.5')
          .css('transition', 'opacity 0.1s');

        // Find the "+" link to help determine the order in which we should add links
        var addSectionEl = this.$(this.sectionLinksContainer)
                               .find(this.sectionLinkContainer + "[data-section-name='AddPage']")[0];

        // If the new link is for a markdown section
        if($(newLink).data("view").type == "PortEditorMdSection"){
          // Find the last markdown section in the list of links
          var currentLinks = this.$(this.sectionLinksContainer).find(this.sectionLinkContainer);
          var i = _.map(currentLinks, function(li){
            return $(li).data("view") ? $(li).data("view").type : "";
          }).lastIndexOf("PortEditorMdSection");
          var lastMdSection = currentLinks[i];
          // Append the new link after the last markdown section, or add it first.
          if (lastMdSection){
            $(lastMdSection).after(newLink);
          } else {
            this.$(this.sectionLinksContainer).prepend(newLink);
          }

          // If this is a newly added markdown section, highlight the section name
          // and make it content editable
          if(isFocused) {
            var newSectionLink = $(newLink).children(".portal-section-link");
            newSectionLink.attr("contenteditable", true);
            newSectionLink.focus();

            //Select the text of the link
            if (window.getSelection && window.document.createRange) {
              var selection = window.getSelection();
              var range = window.document.createRange();
              range.selectNodeContents( newSectionLink[0] );
              selection.removeAllRanges();
              selection.addRange(range);
            } else if (window.document.body.createTextRange) {
              range = window.document.body.createTextRange();
              range.moveToElementText( newSectionLink[0] );
              range.select();
            }
          }
        // If not a markdown section and not the Settings section, and if there
        // is already a "+" link, add new link before the "+" link
      } else if (addSectionEl && sectionView.uniqueSectionLabel != "Settings"){
          $(addSectionEl).before(newLink);
        // If the new link is "Settings", or there's no "+" link yet, insert new link last.
        } else {
          this.$(this.sectionLinksContainer).append(newLink);
        }

        // Animate the link to full width / opacity
        $(newLink).find(this.sectionLinks).animate({
            'max-width': "500px",
            overflow: "hidden",
            opacity: 1
          }, {
          duration: 300,
          complete: function(){
            $(newLink)
              .find(".section-menu-link")
              .css('opacity','1')
          }
        });
      }
      catch(e) {
        console.error("Could not add a new section link. Error message: "+ e);
      }

    },

    /**
     * toggleRemoveSectionOption - Disables the hide and remove option from
     * section link if it's the only section left. Re-enables the remove/hide
     * link when a new section is added. Called on initial render and each time
     * a section is added, removed, shown, or hidden.
     */
    toggleRemoveSectionOption: function(){
      try {

        // Determine the number of pages (sections + metrics + data)
        var totalPages         = this.model.get("sections").length +
                                  !this.model.get("hideMetrics") +
                                  !this.model.get("hideData"),
            removeSectionLinks = this.$(this.sectionLinkContainer)
                                  .find(".remove-section");

        // If there's just one section, hide the delete and hide option on last
        // remaining section link
        if(totalPages == 1){

          removeSectionLinks.addClass("disabled");

          if(!removeSectionLinks.closest("li").find(".tooltip").length){
            removeSectionLinks.closest("li").tooltip({
              placement: "bottom",
              trigger: "hover",
              title: "At least one displayed page is required. To remove this page, first add or show another page."
            });
          }

        // If there are 2 sections, re-show the delete or hide options.
        } else if(totalPages == 2){

          removeSectionLinks.removeClass("disabled");
          removeSectionLinks.closest("li").tooltip("destroy");

        // If there are three or more pages, nothing needs to be changed.
        } else {
          return
        }


      } catch (e) {
        console.log("Failure to show/hide the remove section option. Error message: " + e);
      }
    },

    /**
    * Add a link to the given editor section
    * @param {PortEditorSectionView} sectionView - The view to add a link to
    * @param {string[]} menuOptions - An array of menu options for this section. e.g. Rename, Delete
    * @return {Element}
    */
    createSectionLink: function(sectionView, menuOptions){

      var classes = "";
      if( Array.isArray(menuOptions) && menuOptions.includes("Show") ){
        classes = "hidden-section";
      }

      //Create a section link
      var sectionLink = $(this.sectionLinkTemplate({
        menuOptions: menuOptions || [],
        uniqueLabel: sectionView.uniqueSectionLabel,
        sectionLabel: PortalSection.prototype.isPrototypeOf(sectionView.model)?
                      sectionView.model.get("label") : sectionView.uniqueSectionLabel,
        sectionURL: this.model.get("label") + "/" + sectionView.uniqueSectionLabel,
        sectionType: sectionView.sectionType,
        classes: classes
      }));

      //Attach the section model to the link
      sectionLink.data({
        model: sectionView.model,
        view:  sectionView
      });

      if( sectionView.sectionType == "freeform" && menuOptions.includes("Delete") ){
        var content = $(document.createElement("div"))
                        .append(  $(document.createElement("div"))
                                    .append( $(document.createElement("p"))
                                               .text("Deleting this page will premanently remove it from this " +
                                                     MetacatUI.appModel.get("portalTermSingular") + ".") ),
                                  $(document.createElement("div"))
                                    .addClass("inline-buttons")
                                    .append( $(document.createElement("button"))
                                               .addClass("btn cancelled-section-removal")
                                               .text("No, keep page"),
                                             $(document.createElement("button"))
                                               .addClass("btn btn-danger confirmed-section-removal")
                                               .text("Yes, delete page")));

        // Create a popover with the confirmation buttons
        sectionLink.find(".remove-section").addClass("popover-this").popover({
          html            : true,
          placement       : 'right',
          title           : 'Delete this page?',
          content         : content,
          container       : sectionLink,
          trigger         : "click"
        });
      }

      return sectionLink[0];
    },

    /**
    * Add a link to the given editor section
    * @param {PortEditorSectionView} sectionView - The view to add a link to
    * @param {string[]} menuOptions - An array of menu options for this section. e.g. Rename, Delete
    */
    updateSectionLink: function(sectionView, menuOptions){

      //Create a new link to the section
      var sectionLink = this.createSectionLink(sectionView, menuOptions);

      //Replace the existing link
      this.$(this.sectionLinksContainer).children().each(function(i, link){
        if( $(link).data("view") == sectionView ){
          $(link).replaceWith(sectionLink);
        }
      });
    },

    /**
    * Remove the link to the given section view
    * @param {View} sectionView - The view to remove the link to
    */
    removeSectionLink: function(sectionView){

      // Switch to the default section the user is deleting the active section
      if (sectionView == this.activeSection){
        this.switchSection();
      };

      try{
        //Find the section link associated with this section view
        this.$(this.sectionLinksContainer).children().each(function(i, link){
          if( $(link).data("view") == sectionView ){

            //Remove the menu link
            $(link).addClass("removing").find(".section-menu-link").remove();

            //Destroy any popovers
            $(link).popover("destroy");
            $(link).find(".popover-this").popover("destroy");

            //Hide the section name link with an animation
            $(link).animate({width: "0px", overflow: "hidden"}, {
              duration: 300,
              complete: function(){
                this.remove();
              }
            });
          }
        });
      }
      catch(e){
        console.error(e);
      }
    },

    /**
    * Adds a section and tab to this view and the PortalModel
    * @param {string} sectionType - The type of section to add
    */
    addSection: function(sectionType){

      try{

        //Create a new section to the Portal model
        this.model.addSection(sectionType);

        if(typeof sectionType == "string"){

          switch( sectionType.toLowerCase() ){
            case "data":
              this.switchSection(this.dataView);
              break;
            case "metrics":
              this.renderMetricsSection();
              this.switchSection(this.metricsView);
              break;
            case "freeform":
              //Get the section model that was just added
              var newestSection = this.model.get("sections")[this.model.get("sections").length-1];
              //Render the content section view for it
              this.renderContentSection(newestSection, true);
              //Switch to that new view
              this.switchSection( this.getSectionByModel(newestSection) );
              break;
            case "members":
              // TODO
              // this.switchSection(this.getSectionByLabel("Members"));
              break;
          }

          // If the section we just added is now one of two sections, re-enable
          // the hide/delete button on the other section link.
          this.toggleRemoveSectionOption();

        }
        else{
          return;
        }
      }
      catch(e){
        console.error(e);
      }
    },

    /**
    * Removes a section and its tab from this view and the PortalModel.
    * At least one of the parameters is required, but not both
    * @param {Event} [e] - (optional) The click event on the Remove button
    * @param {Element|jQuery} [sectionLink] - The link element of the section to be removed.
    */
    removeSection: function(e, sectionLink){

      try{
        if( !sectionLink || !sectionLink.length ) {

          var clickedEl = $(e.target);

          //Get the PortalSection model for this remove button
          var sectionLink = clickedEl.parents(this.sectionLinkContainer).first();

          //Exit if no section link was found
          if( !sectionLink || !sectionLink.length ){
            return;
          }
        }

        //Get the section model and view
        var sectionModel = sectionLink.data("model"),
            sectionView  = sectionLink.data("view"),
            sectionType  = sectionLink.data("section-type");

        if( PortalSection.prototype.isPrototypeOf(sectionModel) ){
          //Remove this section from the Portal
          this.model.removeSection(sectionModel);
        }
        else{
          //Remove this section type from the model
          this.model.removeSection(sectionType);
        }

        try {

          //If no section view was found, exit now
          if( !sectionView  ){
            return;
          }

          //If this is not the Data section, remove the view, since Data sections can only be hidden
          if( sectionType.toLowerCase() != "data" ){
            // remove the sectionView
            this.removeSectionLink(sectionView);

            // remove the section view from the subviews array
            this.subviews.splice($.inArray(sectionView, this.subviews), 1);

            //Remove the view from the page
            sectionView.$el.remove();

            //Reset the active section, if the one that was removed is currently active
            if( this.activeSection == sectionView ){
              this.activeSection = undefined;

              //Switch to the default section
              this.switchSection();
            }
          }

        } catch (error) {
          console.error(error);
        }

        // If the section just removed was the second-to-last section, disable
        // the hide/delete button on the last section link.
        this.toggleRemoveSectionOption();

      }
      catch(e){
        console.error(e);
        MetacatUI.appView.showAlert("The section could not be deleted. (" + e.message + ")", "alert-error");
      }

    },

    /**
    * Shows a previously-hidden section
    * @param {Event} [e] - (optional) The click event on the Show button
    */
    showSection: function(e){

      try{

        //Get the PortalSection model for this show button
        var sectionLink = $(e.target).parents(this.sectionLinkContainer),
            section = sectionLink.data("model");

        //If this section is not a PortalSection model, get the section name
        if( !PortalSection.prototype.isPrototypeOf(section) ){
          section = sectionLink.data("section-name");
        }

        //If no section was found, exit now
        if( !section ){
          return;
        }

        //Mark this section as shown
        this.model.addSection(section);

        // If the section we're now showing is now one of two sections, re-enable
        // the hide/delete button on the other section link.
        this.toggleRemoveSectionOption();

      }
      catch(e){
        console.error(e);
        MetacatUI.appView.showAlert("The section could not be shown. (" + e.message + ")", "alert-error");
      }

    },

    /**
    * Renames a section in the tab in this view and in the PortalSectionModel
    * @param {Event} [e] - (optional) The click event on the Rename button
    */
    renameSection: function(e){
      try {
        //Get the PortalSection model for this rename button
        var sectionLink = $(e.target).parents(this.sectionLinkContainer),
            targetLink = sectionLink.children(this.sectionLinks),
            section = sectionLink.data("model");

        // double-click events
        if (e.type === "dblclick") {
          // Continue editing tab-name on double click only for markdown sections
          if($(sectionLink).data("view").type != "PortEditorMdSection"){
            return;
          }
        }

        // make the text editable
        targetLink.attr("contenteditable", true);

        // add focus to the text
        targetLink.focus();

        //Select the text of the link
        if (window.getSelection && window.document.createRange) {
            var selection = window.getSelection();
            var range = window.document.createRange();
            range.selectNodeContents( targetLink[0] );
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (window.document.body.createTextRange) {
            range = window.document.body.createTextRange();
            range.moveToElementText( targetLink[0] );
            range.select();
        }

      } catch (error) {
        console.error(error);
      }

    },

    /**
     * Stops user from entering more than 50 characters, and shows a message
     * if user tries to exceed the limit. Also stops a user from entering
     * RETURN or TAB characters, and instead re-directs to updateName().
     * In the case of the TAB key, the focus moves to the title field.
     * @param {Event} e - The keyup or keydown event when the user types in the portal-section-link field
    */
    limitLabelInput: function(e){

      try{

        // Character limit for the labels
        var limit = 50;
        var currentLabel = $(e.target).text();

        // If the RETURN key is pressed
        if(e.which == 13){
          // Don't allow character to be entered
          e.preventDefault();
          e.stopPropagation();
          // Update name and exit function
          this.updateName(e);
          return
        }

        // If the TAB key is pressed
        if(e.which == 9){
          // Don't allow character to be entered
          e.preventDefault();
          e.stopPropagation();
          // Update name, change focus to title, and exit function
          this.updateName(e);
          $("textarea.title").focus();
          return
        }

        // Keys that a user can use as normal, even if character limit is met
        var allowedKeys = [
          8,  // DELETE
          35, // END
          36, // HOME
          37, // LEFT
          38, // UP
          39, // RIGHT
          40, // DOWN
          46,  // DEL
          17   // CTRL
        ];

        // Stop addition of more characters and show message
        if(
          // If at or greater than limit and
          currentLabel.length >= limit &&
          // key isn't a special key and
          !allowedKeys.includes(e.which) &&
          // cmd key isn't held down and
          !e.metaKey &&
          // user doesn't have some of the text selected
          !window.getSelection().toString().length
        ){
          // Don't allow character to be entered
          e.preventDefault();
          e.stopPropagation();
          // Add a tooltip if one doesn't exist yet
          if(!$(e.delegateTarget).find(".tooltip").length){
            $(e.target).tooltip({
              placement: "top",
              trigger: "manual",
              title: "Limit of " + limit + " characters or fewer"
            });
          }
          // Show the tooltip
          $(e.target).tooltip('show');
        // If under the character limit, proceed as normal.
        } else {
          // Make sure there's no tooltip showing.
          $(e.delegateTarget).find(".tooltip").remove();
        }
      }
      catch(error){
        "Error limiting user input in label field, error message: " + error
      }

    },

    /**
     * Update the section label
     *
     * @param e The event triggering this method
     */
    updateName: function(e) {
      // Remove tooltip incase one was set by limitLabelInput function
      $(e.delegateTarget).find(".tooltip").remove();

      try {
        //Get the PortalSection model for this rename button
        var sectionLink = $(e.target).parents(this.sectionLinkContainer),
            targetLink = sectionLink.find(this.sectionLinks),
            section = sectionLink.data("model");

        // Remove the content editable attribute
        targetLink.attr("contenteditable", false);

        //If this section is an object of PortalSection model, update the label.
        if( section && PortalSection.prototype.isPrototypeOf(section) ){
          // update the label on the model
          section.set("label", targetLink.text().trim());
        }
        else {
          // TODO: handle the case for non-markdown sections
        }

      } catch (error) {
        console.error(error);
      }
    },

    /**
    * Shows a validation error message and adds error styling to the given elements
    * @param {jQuery} elements - The elements to add error styling and messaging to
    */
    showValidation: function(elements){
      try{
        //Get the parent elements that have ids set
        var sectionEls = elements.parents(this.sectionEls);

        //See if there is a matching section link
        for(var i=0; i<sectionEls.length; i++){

          //Get the section view attached to the section element
          var sectionView = sectionEls.data("view");

          //If a section view was found,
          if( sectionView ){
            //Find the section link that links to this section view
            var matchingLink = _.find($(this.sectionLinkContainer), function(link){
              return $(link).data("view") == sectionView;
            });

            //Add the error class and display the error icon
            if( matchingLink ){
              $(matchingLink).addClass("error").find(".icon.error").show();
              //Exit the loop
              i=sectionEls.length+1;
            }
          }
        }
      }
      catch(e){
        console.error("Error showing validation message: ", e);
      }
    },

    /**
    * Closes all the popovers in this view
    */
    closePopovers: function(){
      this.$(".popover-this").popover("hide");
    },

    /**
     * This function is called when the app navigates away from this view.
     * Any clean-up or housekeeping happens at this time.
     */
    onClose: function() {
        //Remove each subview from the DOM and remove listeners
        _.invoke(this.subviews, "remove");

        this.subviews = new Array();
    }

  });

  return PortEditorSectionsView;

});
