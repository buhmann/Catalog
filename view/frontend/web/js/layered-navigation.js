define([
    'uiComponent',
    'jquery',
    'ko',
    'underscore',
    'Buhmann_Catalog/js/navigation-pool',
    'Buhmann_Catalog/js/lib/dynamic-accordion',
], function (Component, $, ko, _, navigationPool) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'Buhmann_Catalog/layer/wrapper',
            accordionConfig: {}
        },

        /**
         * Initialize root navigation components and map reactive tracking loops
         */
        initialize: function () {
            this._super();

            this.isLoading = navigationPool.isLoading;
            this.filtersData = navigationPool.filtersData;

            this.activeFiltersData = ko.computed(() => this._getActiveFiltersList());

            return this;
        },

        /**
         * Verify if at least one choice option is activated across all available groupings
         *
         * @returns {Boolean}
         */
        hasActiveFilters: function () {
            return this._getActiveFiltersList().length > 0;
        },

        /**
         * Check if there is at least one filter that actually contains selectable options or an active slider
         *
         * @returns {Boolean}
         */
        hasFilters: function () {
            const groups = this.filtersData() || [];

            return groups.some(group => {
                // Check standard filters that have selectable items available
                if (group.items && Array.isArray(group.items) && group.items.length > 0) {
                    return true;
                }

                // Check slider filters using the exact configuration boundary logic from active list
                if (group.type === 'slider' && group.sliderConfig && group.sliderConfig.currentValue) {
                    const val = group.sliderConfig.currentValue;
                    const min = group.sliderConfig.minValue;
                    const max = group.sliderConfig.maxValue;

                    if (val && min && max && (parseFloat(val.from) > parseFloat(min) || parseFloat(val.to) < parseFloat(max))) {
                        return true;
                    }
                }

                return false;
            });
        },

        /**
         * Remove active filter action
         *
         * @param clearUrl
         * @param event
         * @returns {boolean}
         */
        removeActiveFilter: function (clearUrl, event) {
            if (event) event.preventDefault();
            if (clearUrl) navigationPool.navigate(clearUrl);
            return false;
        },

        /**
         * Safely handle the "Clear All" activation link by routing the request to the pool
         *
         * @param {Object} data - Element context scope
         * @param {Event} event - System interaction payload
         */
        clearAll: function (data, event) {
            if (event) {
                event.preventDefault();
                if (event.hasOwnProperty('originalEvent')) {
                    event.originalEvent.preventDefault();
                    event.originalEvent.stopPropagation();
                }
                event.stopPropagation();
            }

            const clearUrl = event && event.currentTarget ? event.currentTarget.getAttribute('href') : window.location.pathname;

            if (clearUrl) {
                navigationPool.navigate(clearUrl);
            }

            return false;
        },

        /**
         * Internal helper to identify active filters based on data structure
         * * @returns {Array}
         * @private
         */
        _getActiveFiltersList: function () {
            const groups = this.filtersData() || [];
            const activeItems = [];

            groups.forEach(group => {
                if (group.items && Array.isArray(group.items)) {
                    group.items.forEach(item => {
                        if (item.is_selected === true) {
                            activeItems.push({
                                filterLabel: group.label,
                                valueLabel: item.label,
                                clearUrl: item.url
                            });
                        }
                    });
                }

                if (group.type === 'slider') {
                    const sliderConfig = group.hasOwnProperty('sliderConfig') ? group.sliderConfig : {currentValue: false};
                    if (group.type === 'slider' && sliderConfig.currentValue) {
                        const val = sliderConfig.currentValue;
                        const min = sliderConfig.minValue;
                        const max = sliderConfig.maxValue;
                        const currency = sliderConfig.currencySymbol || '$';

                        if ((parseFloat(val.from) > parseFloat(min) || parseFloat(val.to) < parseFloat(max))) {
                            activeItems.push({
                                filterLabel: group.label,
                                valueLabel: currency + val.from + '.00 - ' + currency + val.to + '.00',
                                clearUrl: sliderConfig.urlTemplate ? sliderConfig.urlTemplate.split('?')[0] : '#'
                            });
                        }
                    }
                }
            });

            return activeItems;
        },
    });
});
