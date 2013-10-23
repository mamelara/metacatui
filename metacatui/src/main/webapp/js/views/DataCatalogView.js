/*global define */
define(['jquery',
				'jqueryui', 
				'underscore', 
				'backbone',
				'views/SearchResultView',
				'text!templates/search.html',
				'text!templates/statCounts.html',
				'text!templates/pager.html',
				'text!templates/resultsItem.html',
				'text!templates/mainContent.html',
				'text!templates/currentFilter.html'
				], 				
	function($, $ui, _, Backbone, SearchResultView, CatalogTemplate, CountTemplate, PagerTemplate, ResultItemTemplate, MainContentTemplate, CurrentFilterTemplate) {
	'use strict';
	
	var DataCatalogView = Backbone.View.extend({

		el: '#Content',
		
		template: _.template(CatalogTemplate),
		
		statsTemplate: _.template(CountTemplate),
		
		pagerTemplate: _.template(PagerTemplate),

		resultTemplate: _.template(ResultItemTemplate),
		
		mainContentTemplate: _.template(MainContentTemplate),
		
		currentFilterTemplate: _.template(CurrentFilterTemplate),
		
		// Delegated events for creating new items, and clearing completed ones.
		events: {
							'click #results_prev' : 'prevpage',
							'click #results_next' : 'nextpage',
					 'click #results_prev_bottom' : 'prevpage',
					 'click #results_next_bottom' : 'nextpage',
			       			   'click .pagerLink' : 'navigateToPage',
							  'click .filter.btn' : 'updateTextFilters',
						  'keypress input.filter' : 'triggerOnEnter',
							  'change #sortOrder' : 'triggerSearch',
							   'change #min_year' : 'updateYearRange',
							   'change #max_year' : 'updateYearRange',
			                'click #publish_year' : 'updateYearRange',
			                   'click #data_year' : 'updateYearRange', 
						   'click .remove-filter' : 'removeFilter',
			'click input[type="checkbox"].filter' : 'updateBooleanFilters',
							   'click #clear-all' : 'resetFilters',
					 'click .keyword-search-link' : 'additionalCriteria'

		},
		
		initialize: function () {
			
		},
		
		triggerSearch: function() {	
			console.log('Search triggered');			
			
			//Set the sort order 
			var sortOrder = $("#sortOrder").val();
			searchModel.set('sortOrder', sortOrder);
			
			//Trigger a search to load the results
			appModel.trigger('search');
			
			// make sure the browser knows where we are
			var route = Backbone.history.fragment;
			if (route.indexOf("data") < 0) {
				uiRouter.navigate("data");
			} else {
				uiRouter.navigate(route);
			}
			
			// ...but don't want to follow links
			return false;
		},
		
		triggerOnEnter: function(e) {
			if (e.keyCode != 13) return;
			
			//Update the filters
			this.updateTextFilters(e);
		},
				
		// Render the main view and/or re-render subviews. Don't call .html() here
		// so we don't lose state, rather use .setElement(). Delegate rendering 
		// and event handling to sub views
		render: function () {

			console.log('Rendering the DataCatalog view');
			appModel.set('headerType', 'default');
			
			//Populate the search template with some model attributes
			var cel = this.template(
					{
						sortOrder: searchModel.get('sortOrder'),
						yearMin: searchModel.get('yearMin'),
						yearMax: searchModel.get('yearMax'),
						pubYear: searchModel.get('pubYear'),
						dataYear: searchModel.get('dataYear'),
						resourceMap: searchModel.get('resourceMap'),
						searchOptions: registryModel.get('searchOptions')
						
					}
			);
			this.$el.html(cel);
			this.updateStats();
			
			
			//Update the year slider
			this.updateYearRange(); 
			
			//Initialize the year type label tooltips
			$('.year-tooltip').tooltip();
			$('.tooltip-this').tooltip();
			
			//Iterate through each search model text attribute and show UI filter for each
			var categories = ['all', 'creator', 'taxon'];
			var thisTerm = null;
			
			for (var i=0; i<categories.length; i++){
				thisTerm = searchModel.get(categories[i]);
				for (var x=0; x<thisTerm.length; x++){
					this.showFilter(categories[i], thisTerm[x]);
				}
			}			
			
			// Register listeners; this is done here in render because the HTML
			// needs to be bound before the listenTo call can be made
			this.stopListening(appSearchResults);
			this.listenTo(appSearchResults, 'add', this.addOne);
			this.listenTo(appSearchResults, 'reset', this.addAll);
			
			//Listen to changes in the searchModel
			this.stopListening(searchModel);
			
			// listen to the appModel for the search trigger
			this.stopListening(appModel);
			this.listenTo(appModel, 'search', this.showResults);

			// Store some references to key views that we use repeatedly
			this.$resultsview = this.$('#results-view');
			this.$results = this.$('#results');
			
			// show the results by default
			console.log("Backbone.history.fragment=" + Backbone.history.fragment);
			
			// and go to a certain page if we have it
			this.showResults();
			

			return this;
		},

		showResults: function (page) {
			console.log('showing results');
			
			var page = appModel.get("page");
			if (page == null) {
				page = 0;
			}
			
			//Get all the search model attributes
			//Start with the 'all' category
			var search = searchModel.get('all');
			var sortOrder = searchModel.get('sortOrder');
			
			this.removeAll();
			
			appSearchResults.setrows(25);
			appSearchResults.setSort(sortOrder);
			appSearchResults.setfields("id,title,origin,pubDate,dateUploaded,abstract,resourceMap");
			
			//Create the filter terms from the search model and create the query
			var query = "formatType:METADATA+-obsoletedBy:*";
			
			//resourceMap
			var resourceMap = searchModel.get('resourceMap');
			if(resourceMap){
				query += '+resourceMap:resourceMap*';
			}
			
			//Function here to check for spaces in a string - we'll use this to url encode the query
			var phrase = function(entry){
				var space = null;
				
				space = entry.indexOf(" ");
				
				if(space < 0){
					return false;
				}
				else{
					return true;
				}
			};
			
			//All
			var thisAll = null;
			var all = searchModel.get('all');
			for(var i=0; i < all.length; i++){
				//Trim the spaces off
				thisAll = all[i].trim();
				
				//Is this a phrase?
				if(phrase(thisAll)){
					thisAll = thisAll.replace(" ", "%20");
					query += "+*%22" + thisAll + "%22*";
				}
				else{
					query += "+" + thisAll;
				}
			}
			
			//Creator
			var thisCreator = null;
			var creator = searchModel.get('creator');
			for(var i=0; i < creator.length; i++){
				//Trim the spaces off
				thisCreator = creator[i].trim();
				
				//Is this a phrase?
				if(phrase(thisCreator)){
					thisCreator = thisCreator.replace(" ", "%20");
					query += "+origin:*%22" + thisCreator + "%22*";
				}
				else{
					query += "+origin:*" + thisCreator + "*";
				}
			}
			
			//Taxon - just searching the default text field for now until we index taxon
			var taxon = searchModel.get('taxon');
			for(var i=0; i < taxon.length; i++){
				query += "*" + taxon[i].trim() + "*";
			}
			
			// Additional criteria - both field and value are provided
			var additionalCriteria = searchModel.get('additionalCriteria');
			for (var i=0; i < additionalCriteria.length; i++){
				query += additionalCriteria[i];
			}
			
			//Year
			//Get the types of year to be searched first
			var pubYear = searchModel.get('pubYear');
			var dataYear = searchModel.get('dataYear');
			//Get the minimum and maximum years chosen
			var yearMin = searchModel.get('yearMin');
			var yearMax = searchModel.get('yearMax');
			//Add to the query if we are searching data coverage year
			if(dataYear){
				query += "+beginDate:%5B" + yearMin + "-01-01T00:00:00Z%20TO%20NOW%5D+endDate:%5B*%20TO%20" + yearMax + "-12-31T00:00:00Z%5D";
			}
			//Add to the query if we are searching publication year
			if(pubYear){
				query += "+dateUploaded:%5B" + yearMin + "-01-01T00:00:00Z%20TO%20" + yearMax + "-12-31T00:00:00Z%5D";				
			}
			
			console.log('query: ' + query);
			
			appSearchResults.setFacet(["keywords"]);
			appSearchResults.setQuery(query);
			
			// go to the page
			this.showPage(page);
			
			// don't want to follow links
			return false;
		},
		
		updateTextFilters : function(e){
			//Get the search/filter category
			var category = $(e.target).attr('data-category');
			
			//Try the parent elements if not found
			if(!category){
				var parents = $(e.target).parents().each(function(){
					category = $(this).attr('data-category');
					if (category){
						return false;
					}
				});
			}
			
			if(!category){ return false; }
			
			//Get the value of the associated input
			var input = this.$el.find($('#' + category + '_input'));
			var term = input.val();
			
			//Now clear that input
			input.val('');
				
			//Get the current searchModel array
			var filtersArray = _.clone(searchModel.get(category));
				
			//Check if this entry is a duplicate
			var duplicate = (function(){
				for(var i=0; i < filtersArray.length; i++){
					if(filtersArray[i] === term){ return true; }
				}
			})();
			
			if(duplicate){ return false; }
				
			//Add the new entry to the array of current filters
			filtersArray.push(term);
			
			//Replace the current array with the new one in the search model
			searchModel.set(category, filtersArray);
				
			//Show the UI filter
			this.showFilter(category, term);
			
			//Trigger a new search
			this.triggerSearch();
		},
		
		updateBooleanFilters : function(e){
			//Get the category
			var category = $(e.target).attr('data-category');
			
			//Get the check state
			var state = $(e.target).prop('checked');

			//Update the model
			searchModel.set(category, state);
			
			//Trigger a new search
			this.triggerSearch();
		},
		
		//Update the UI year slider and input values
		//Also update the model
		updateYearRange : function(e) {
			
			var viewRef = this;
			
			// Get the minimum and maximum values from the input fields
			var minVal = $('#min_year').val();
			var maxVal = $('#max_year').val();
			console.log(minVal, maxVal);
			
			//Also update the search model
		    searchModel.set('yearMin', minVal);
		    searchModel.set('yearMax', maxVal);
			
			//Get the minimum and maximum values from the metacat results
			var minResultsVal = searchModel.get('resultsYearMin');
			var maxResultsVal = searchModel.get('resultsYearMax');
						
			
			//jQueryUI slider 
			$('#year-range').slider({
			    range: true,
			    disabled: true,
			    min: minResultsVal,			//sets the minimum on the UI slider on initialization
			    max: maxResultsVal, 		//sets the maximum on the UI slider on initialization
			    values: [ minVal, maxVal ], //where the left and right slider handles are
			    stop: function( event, ui ) {
			      // When the slider is changed, update the input values
			      $('#min_year').val(ui.values[0]);
			      $('#max_year').val(ui.values[1]);
			      
			      //Also update the search model
			      searchModel.set('yearMin', $('#min_year').val());
			      searchModel.set('yearMax', $('#max_year').val());
			      
			      //Trigger a new search
			      viewRef.triggerSearch();
			    }
			  });
			
			//Check checkbox values for type of year
			//All the slider elements this will affect
			var sliderEls = [$('#year-range'), $('#min_year'), $('#max_year')];
			//If either data year or publication year is checked,
			if($('#data_year').prop("checked") || ($('#publish_year').prop("checked"))){
				//Then enable the jQueryUI slider
				$('#year-range').slider("option", "disabled", false);
				
				//And enable all elements and remove disabled class
				for(var i=0; i<sliderEls.length; i++){
					sliderEls[i].removeClass('disabled');
					sliderEls[i].prop("disabled", false);
				}
			}
			//If neither are checked
			else if(!$('#data_year').prop("checked") && (!$('#publish_year').prop("checked"))){
				//Disable the jQueryUI slider
				$('#year-range').slider("option", "disabled", true);
				
				//And disbale all elements and add disabled class
				for(var i=0; i<sliderEls.length; i++){
					sliderEls[i].addClass('disabled');
					sliderEls[i].prop("disabled", true);
				}
			}


		},
		
		//Removes a specific filter term from the searchModel
		removeFilter : function(e){			
			//Get the parent element that stores the filter term
			var filterNode = $(e.target).parent();
			
			//Get the filter term
			var term = $(filterNode).attr('data-term');
			console.log('removing '+ term);
			
			//Find this element's category in the data-category attribute of it's parent
			var category = filterNode.parent().attr('data-category');
			
			//Remove this filter term from the searchModel
			this.removeFromModel(category, term);
			
			//Hide the filter from the UI
			this.hideFilter(filterNode);
			
			//Trigger a new search
			this.triggerSearch();

		},
		
		//Clear all the currently applied filters
		resetFilters : function(e){			
			var viewRef = this;
			
			//Clear all the filters in the UI
			this.$el.find('.current-filter').each(function(){
				viewRef.hideFilter(this);
			});
			
			//Then reset the model
			searchModel.clear().set(searchModel.defaults);		
			
			//Reset the year slider handles
			$("#year-range").slider("values", [searchModel.get('yearMin'), searchModel.get('yearMax')])
			//and the year inputs
			$("#min_year").val(searchModel.get('yearMin'));
			$("#max_year").val(searchModel.get('yearMax'));

			//Reset the checkboxes
			$("#includes_data").prop("checked", searchModel.get("resourceMap"));
			$("#data_year").prop("checked", searchModel.get("pubYear"));
			$("#publish_year").prop("checked", searchModel.get("dataYear"));
		
			//Trigger a new search
			this.triggerSearch();
		},
		
		//Removes a specified filter node from the DOM
		hideFilter : function(filterNode){
			//Remove the filter node from the DOM
			$(filterNode).fadeOut("slow", function(){
				filterNode.remove();
			});	
		},
		
		//Removes a specified filter from the search model
		removeFromModel : function(category, term){			
			//Remove this filter term from the searchModel
			if (category){
				//Get the current filter terms array
				var currentTerms = searchModel.get(category);
				//Remove this filter term from the array
				var newTerms = _.without(currentTerms, term);
				//Set the new value
				searchModel.set(category, newTerms);				
			}
		},
		
		//Adds a specified filter node to the DOM
		showFilter : function(category, term){
			
			var viewRef = this;
			
			//Get the element to add the UI filter node to 
			//The pattern is #current-<category>-filters
			var e = this.$el.find('#current-' + category + '-filters');
							
			//Add a filter node to the DOM
			e.prepend(viewRef.currentFilterTemplate({filterTerm: term}));
				
			return;
		},
		
		//Removes a specific filter term from the searchModel
		additionalCriteria : function(e){			
			// Get the clicked node
			var targetNode = $(e.target);
			
			// style the selection
			$(".keyword-search-link").removeClass("active");
			targetNode.addClass("active");
			
			// Get the filter criteria
			var term = targetNode.attr('data-term');
			console.log('applying additional criteria '+ term);
			
			// Find this element's category in the data-category attribute
			var category = targetNode.attr('data-category');
			
			// Add this criteria to the search model
			searchModel.set(category, term);
			
			// Trigger the search
			this.triggerSearch();
			
			// prevent default action of click
			return false;

		},

		updateStats : function() {
			if (appSearchResults.header != null) {
				this.$statcounts = this.$('#statcounts');
				this.$statcounts.html(
					this.statsTemplate({
						start : appSearchResults.header.get("start") + 1,
						end : appSearchResults.header.get("start") + appSearchResults.length,
						numFound : appSearchResults.header.get("numFound")
					})
				);
			}
			
			// piggy back here
			this.updatePager();
			this.getFacetCounts();
			

		},
		
		updatePager : function() {
			if (appSearchResults.header != null) {
				var pageCount = Math.ceil(appSearchResults.header.get("numFound") / appSearchResults.header.get("rows"));
				var pages = new Array(pageCount);
				// mark current page correctly, avoid NaN
				var currentPage = -1;
				try {
					currentPage = Math.floor((appSearchResults.header.get("start") / appSearchResults.header.get("numFound")) * pageCount);
				} catch (ex) {
					console.log(ex.message);
				}
				this.$resultspager = this.$('#resultspager');
				this.$resultspager.html(
					this.pagerTemplate({
						pages: pages,
						currentPage: currentPage
					})
				);
			}
		},
		
		updatePageNumber: function(page) {
			console.log("Backbone.history.fragment=" + Backbone.history.fragment);
			var route = Backbone.history.fragment;
			if (route.indexOf("/page/") >= 0) {
				//replace the last number with the new one
				route = route.replace(/\d+$/, page);
			} else {
				route += "/page/" + page;
			}
			appModel.set("page", page);
			uiRouter.navigate(route);
		},

		// Next page of results
		nextpage: function () {
			this.removeAll();
			appSearchResults.nextpage();
			this.$resultsview.show();
			this.updateStats();
			
			var page = appModel.get("page");
			page++;
			this.updatePageNumber(page);
		},
		
		// Previous page of results
		prevpage: function () {
			this.removeAll();
			appSearchResults.prevpage();
			this.$resultsview.show();
			this.updateStats();
			
			var page = appModel.get("page");
			page--;
			this.updatePageNumber(page);
		},
		
		navigateToPage: function(event) {
			var page = $(event.target).attr("page");
			this.showPage(page);
		},
		
		showPage: function(page) {
			//Remove all the current search results
			this.removeAll();
			appSearchResults.toPage(page);
			this.$resultsview.show();
			this.updateStats();	
			this.updatePageNumber(page);
		},
		
		//Get the facet counts
		getFacetCounts: function(){
			if (appSearchResults.header != null) {
				console.log(appSearchResults.facetCounts.keywords);
				
				var facetCounts = appSearchResults.facetCounts;
				//Set up the autocomplete (jQueryUI) feature for each input
				//For the 'all' filter, use keywords
				var allSuggestions = appSearchResults.facetCounts.keywords;
				$('#all_input').autocomplete({
					source: allSuggestions
				});
			}
			/*//Get the facet counts from the search results			
			//Set up the autocomplete (jQueryUI) feature for each input
			//For the 'all' filter, use keywords
			var allSuggestions = facetCounts.keywords;
			$('#all_input').autocomplete({
				source: allSuggestions
			});*/
			
			//Let's log them all for now for testing purposes
			
		},
		
		// Add a single SolrResult item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOne: function (result) {
			this.$view_service = appModel.get('viewServiceUrl');
			this.$package_service = appModel.get('packageServiceUrl');
			result.set( {view_service: this.$view_service, package_service: this.$package_service} );
			var view = new SearchResultView({ model: result });
			// Initialize the tooltip for the has data icon
			$(".has-data").tooltip();
			this.$results.append(view.render().el);
		},

		// Add all items in the **SearchResults** collection at once.
		addAll: function () {
			appSearchResults.each(this.addOne, this);
			this.updateStats();
		},
		
		// Remove all html for items in the **SearchResults** collection at once.
		removeAll: function () {
			this.$results.html('');
		},
		
		onClose: function () {			
			console.log('Closing the data view');
			// remove everything so we don't get a flicker
			this.$el.html('')
		}				
	});
	return DataCatalogView;		
});
