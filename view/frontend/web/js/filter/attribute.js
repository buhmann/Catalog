define([
    'Smile_ElasticsuiteCatalog/js/attribute-filter'
], function (Component) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'Buhmann_Catalog/layer/filter/attribute',
        },
        initialize: function () {
            this._super();

            return this;
        }
    });
});
