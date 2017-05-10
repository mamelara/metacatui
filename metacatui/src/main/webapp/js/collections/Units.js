"use strict";

define(["jquery", "underscore", "backbone", "x2js", "models/metadata/eml211/EMLUnit"],
    function($, _, Backbone, X2JS, EMLUnit) {

    /*
     * Units represents the Ecological Metadata Language units list
     */
    var Units = Backbone.Collection.extend({

        model: EMLUnit,

        /* Create a new Units collection */
        initialize: function() {
            console.log("Units.initialize() called.");

        },

        /*
         * The URL of the EML unit Dictionary
         */
        url: "https://raw.githubusercontent.com/NCEAS/eml/RELEASE_EML_2_1_1/eml-unitDictionary.xml",

        /* Retrieve the units from the tagged EML Github Repository */
        fetch: function(options) {
            var fetchOptions = _.extend({dataType: "text"}, options);

            return Backbone.Model.prototype.fetch.call(this, fetchOptions);

        },

        /* Parse the XML response */
        parse: function(response) {
            console.log("Units.parse() called.");

            // If the collection is already parsed, just return it
            if ( typeof response === "object" ) return response;

            // Otherwise, parse it
            var x2js = new X2JS();
            var units = x2js.xml_str2json(response);

            return units.unitList.unit;
        }

    });

    return Units;
});