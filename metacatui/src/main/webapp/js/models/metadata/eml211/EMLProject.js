/* global define */
define(['jquery', 'underscore', 'backbone', "models/DataONEObject", "models/metadata/eml211/EMLParty"], 
    function($, _, Backbone, DataONEObject, EMLParty) {

	var EMLProject = Backbone.Model.extend({
		
		defaults: {
			objectDOM: null,
			title: null,
			funding: [],
			personnel: null,
			parentModel: null
		},
		
		initialize: function(options){
			if(options && options.objectDOM) 
				this.set(this.parse(options.objectDOM));

			this.on("change:personnel change:funding change:title", this.trickleUpChange);
		},
		
		nodeNameMap: function(){
			return {
				"descriptorvalue" : "descriptorValue",
				"designdescription" : "designDescription",
				"studyareadescription" : "studyAreaDescription",
				"relatedproject" : "relatedProject",
				"researchproject" : "researchProject"
			}
		},
		
		//TODO: This only supports the funding element right now
		parse: function(objectDOM){
			if(!objectDOM)
				var objectDOM = this.get("objectDOM");
			
			var modelJSON = {};
			
			//Parse the funding info
			modelJSON.funding = [];
			var fundingEl    = $(objectDOM).find("funding"),
				fundingNodes = fundingEl.children("para").length ? fundingEl.children("para") : fundingEl;
			
			_.each(fundingNodes, function(fundingNode){
				modelJSON.funding.push( $(fundingNode).text() );
			}, this);
			
			/*
			var personnelNode = $(objectDOM).find("personnel");
			modelJSON.personnel = [];
			for(var i=0; i<personnelNode.length; i++){
				modelJSON.personnel.push( new EMLParty({ objectDOM: personnelNode[i], parentModel: this }));
			}
			*/
			
			return modelJSON;
		},
		
		serialize: function(){
			var objectDOM = this.updateDOM(),
				xmlString = objectDOM.outerHTML;
	
			//Camel-case the XML
	    	xmlString = this.formatXML(xmlString);
		
	    	return xmlString;
		},
		
		updateDOM: function(){
			var objectDOM = this.get("objectDOM") ? this.get("objectDOM").cloneNode(true) : document.createElement("project");
			
			//Create a project title
			//If there is no title node, create one
			if( !$(objectDOM).find("title").length ){
				var title = this.get("title") || this.get("parentModel").get("title") || "";
				$(objectDOM).prepend( $(document.createElement("title")).text(title) );
			}
			
			//Create project personnel
			if( !$(objectDOM).find("personnel").length ){
				var personnel = this.get("personnel");
				
				if(!personnel){
					_.each(this.get("parentModel").get("creator"), function(party){
						
						var personnel = new EMLParty({
							role: "principalInvestigator",
							parentModel: this,
							type: "personnel",
							individualName: party.get("individualName")							
						});
						
						this.set("personnel", [personnel]);
						
						$(objectDOM).append(personnel.updateDOM());
					}, this);
				}
				else{
					_.each(this.get("personnel"), function(party){						
						$(objectDOM).append(party.updateDOM());
					}, this);
				}					
			}
			 
			//Get or create the funding element
			var fundingNode = $(objectDOM).find("funding");
			if(!fundingNode.length){
				fundingNode = document.createElement("funding");
				$(objectDOM).append(fundingNode);				
			}
			
			//Get the current paragraph elements
			var fundingParas = $(fundingNode).children("para");
			
			_.each(this.get("funding"), function(funding, i){
				if(fundingParas[i])
					$(fundingParas[i]).text(funding);
				else
					$(fundingNode).append( $(document.createElement("para")).text(funding) );
			});
			
			return objectDOM;
		},
		
		trickleUpChange: function(){
			this.get("parentModel").trigger("change");
		},
		
		formatXML: function(xmlString){
			return DataONEObject.prototype.formatXML.call(this, xmlString);
		}
	});
	
	return EMLProject;
});