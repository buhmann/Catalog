define([
    'uiComponent',
    'ko',
    'underscore',
    'Buhmann_Catalog/js/navigation-pool'
], function (Component, ko, _, navigationPool) {
    'use strict';

    return Component.extend({
        defaults: {
            filterCode: 'cat',
            isMultipleSelectEnabled: true,
            shouldDisplayProductCount: true,
            template: 'Buhmann_Catalog/layer/filter/category'
        },

        /**
         * Initialize component and register active observable hooks
         */
        initialize: function () {
            this._super();

            this.items = ko.observableArray([]);
            this.updateItemsFromPool(navigationPool.filtersData());

            navigationPool.filtersData.subscribe((allFilters) => {
                this.updateItemsFromPool(allFilters);
            });
        },

        /**
         * Scan incoming request pool filters to locate accurate category blocks
         *
         * @param {Array} allFilters
         */
        updateItemsFromPool: function (allFilters) {
            if (!allFilters || !Array.isArray(allFilters)) {
                return;
            }

            const matchedFilter = _.find(allFilters, (filter) => {
                return filter.code === this.filterCode;
            });

            if (matchedFilter && matchedFilter.items) {
                this.items(matchedFilter.items);
            }
        },

        /**
         * Intercept element interaction and safely fire target navigation query
         *
         * @param {Object} data - Context item array scope payload
         * @param {Event} event - Native system browser interaction event
         */
        handleNavigation: function (data, event) {
            if (event) {
                event.preventDefault();
            }

            if (data && data.url) {
                navigationPool.navigate(data.url);
            }
            return false;
        }
    });
});
