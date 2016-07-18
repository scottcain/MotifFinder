require({cache:{
'JBrowse/Plugin':function(){
define("JBrowse/Plugin", [
           'dojo/_base/declare',
           'JBrowse/Component'
       ],
       function( declare, Component ) {
return declare( Component,
{
    constructor: function( args ) {
        this.name = args.name;
        this.cssLoaded = args.cssLoaded;
        this._finalizeConfig( args.config );
        console.log('loading MotifFinder pluging');
    },

    _defaultConfig: function() {
        return {
            baseUrl: '/plugins/'+this.name
        };
    }
});
});
},
'MotifFinder/View/SearchSeqDialog':function(){
define([
        'dojo/_base/declare',
        'dojo/dom-construct',
        'dojo/aspect',
        'dijit/focus',
        'dijit/form/Button',
        'dijit/form/CheckBox',
        'dijit/form/Select',
        'JBrowse/View/Dialog/WithActionBar'
    ],
    function(
        declare,
        dom,
        aspect,
        focus,
        dButton,
        dCheckBox,
        dSelect,
        ActionBarDialog
    ) {

return declare( ActionBarDialog, {

    constructor: function() {
        var thisB = this;
        aspect.after( this, 'hide', function() {
              focus.curNode && focus.curNode.blur();
              setTimeout( function() { thisB.destroyRecursive(); }, 500 );
        });
    },

    _dialogContent: function () {
        var content = this.content = {};

        var container = dom.create('div', { className: 'search-dialog' } );

        var introdiv = dom.create('div', {
            className: 'search-dialog intro',
            innerHTML: 'This tool uses a Position Weight Matrix to find sequence motifs'
        }, container );

        // Render matrix select 
        var selectDiv = dom.create('div', {
            className: "section"
        }, container );

        content.matrix = new dSelect({
        name: "select_matrix",
        options: [
            { label: "EcoRI", value: "GAATTC" },
            { label: "Acc36I", value: "ACCTGC"},
            { label: "AceIII", value: "CAGCTC" },
            { label: "AflIII", value: "AC[AG][CT]GT" },
            { label: "AlfI", value: "GCA([ATCGN]{6})TGC" }
           ]
        })
        selectDiv.appendChild( content.matrix.domNode );
        dom.create( "label", { "for": "select_matrix", innerHTML: " Select matrix"}, selectDiv );

        return container;
    },

    _getSearchParams: function() {
        var content = this.content;
        return {
            matrix: content.matrix.get('value'),
            maxLen: 100
        };
    },

    _fillActionBar: function ( actionBar ) {
        var thisB = this;

        new dButton({
                            label: 'Search',
                            iconClass: 'dijitIconBookmark',
                            onClick: function() {
                                var searchParams = thisB._getSearchParams();
                                thisB.callback( searchParams );
                                thisB.hide();
                            }
                        })
            .placeAt( actionBar );
        new dButton({
                            label: 'Cancel',
                            iconClass: 'dijitIconDelete',
                            onClick: function() {
                                thisB.callback( false );
                                thisB.hide();
                            }
                        })
            .placeAt( actionBar );
    },

    show: function ( callback ) {
        this.callback = callback || function() {};
        this.set( 'title', "Add motif search track");
        this.set( 'content', this._dialogContent() );
        this.inherited( arguments );
        focus.focus( this.closeButtonNode );
    }

});
});
},
'MotifFinder/Store/SeqFeature/MotifFinder':function(){
define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/Errors',
        'JBrowse/Util',
        'JBrowse/CodonTable'
    ],
    function(
        declare,
        array,
        lang,
        SeqFeatureStore,
        SimpleFeature,
        JBrowseErrors,
        Util,
        CodonTable
    ) {


    return declare( SeqFeatureStore , {

        constructor: function( args ) {
            this.searchParams = args.searchParams;
        },

        _defaultConfig: function() {
            return Util.deepUpdate(
                dojo.clone( this.inherited(arguments) ),
                {
                    regionSizeLimit: 1000000 // 1Mb 
                });
        },

        getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
            var searchParams = lang.mixin(
                // store the original query bounds - this helps prevent features from randomly disappearing
                { orig: { start: query.start, end: query.end }},
                this.searchParams,
                query.searchParams
            );

            var regionSize = query.end - query.start;
            if( regionSize > this.config.regionSizeLimit )
                throw new JBrowseErrors.DataOverflow( 'Region too large to search' );

            var thisB = this;
            this.browser.getStore('refseqs', function( refSeqStore ) {
                if( refSeqStore )
                    refSeqStore.getReferenceSequence(
                        query,
                        function( sequence ) {
                            thisB.doSearch( query, sequence, searchParams, featCallback );
                            doneCallback();
                        },
                        errorCallback
                    );
                 else
                     doneCallback();
             });
        },

        doSearch: function( query, sequence, params, featCallback ) {
            var expr = new RegExp(
                params.motif,
                "gi" //used to be case ignore
            );

            var sequences = [];
            sequences.push( [sequence,1] );
            sequences.push( [Util.revcom( sequence ),-1] );

            array.forEach( sequences, function( r ) {
                    this._searchSequence( query, r[0], expr, r[1], featCallback );
            }, this );
        },

        _searchSequence: function( query, sequence, expr, strand, featCallback, frameOffset ) {

            frameOffset = frameOffset || 0;

            var start = query.start, end = query.end;

            var features = [];
            var match;
            while( (match = expr.exec( sequence )) !== null && match.length ) {
                expr.lastIndex = match.index + 1;

                var result = match[0];

                var newStart = strand > 0 ? start + frameOffset + match.index
                    : end - frameOffset - (match.index + result.length);
                var newEnd = strand > 0 ? start + frameOffset + (match.index + result.length)
                    : end - frameOffset - match.index;

                var newFeat = new SimpleFeature(
                    {
                        data: {
                            start: newStart,
                            end: newEnd,
                            searchMatch: result,
                            strand: strand
                        },
                        id: [newStart,newEnd,result].join(',')
                    });
                featCallback( newFeat );
            }
        }

    });
});
}}});
define("MotifFinder/main", [
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
            'dijit/MenuItem',
           'JBrowse/Plugin',
           './View/SearchSeqDialog'
       ],
       function(
           declare,
           lang,
           Deferred,
           dijitMenuItem,
           JBrowsePlugin,
           SearchSeqDialog
       ) {
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        this._searchTrackCount = 0;

        var thisB = this;
        this.browser.afterMilestone('initView', function() {
            this.browser.addGlobalMenuItem( 'file', new dijitMenuItem(
                                           {
                                               label: 'Add motif search track',
                                               iconClass: 'dijitIconBookmark',
                                               onClick: lang.hitch(this, 'createSearchTrack')
                                           }));
        }, this );

    },

    createSearchTrack: function() {

        var searchDialog = new SearchSeqDialog();
        var thisB = this;
        searchDialog.show(
            function( searchParams ) {
                if( !searchParams )
                    return;

                var storeConf = {
                    browser: thisB.browser,
                    refSeq: thisB.browser.refSeq,
                    type: 'MotifFinder/Store/SeqFeature/MotifFinder',
                    searchParams: searchParams
                };
                var storeName = thisB.browser.addStoreConfig( undefined, storeConf );
                storeConf.name = storeName;
                var searchTrackConfig = {
                    type: 'JBrowse/View/Track/CanvasFeatures',
                    label: 'search_track_' + (thisB._searchTrackCount++),
                    key: "Search reference sequence for '"+ searchParams.motif ,
                    metadata: {
                        category: 'Local tracks',
                        Description: "Contains all motifs that match with the PWM '" + searchParams.motif + "'"
                    },
                    store: storeName
                };

                // send out a message about how the user wants to create the new track
                thisB.browser.publish( '/jbrowse/v1/v/tracks/new', [searchTrackConfig] );

                // Open the track immediately
                thisB.browser.publish( '/jbrowse/v1/v/tracks/show', [searchTrackConfig] );
            });
}

});
});
