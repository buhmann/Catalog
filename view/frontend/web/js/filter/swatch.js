define([
    'uiComponent',
    'ko',
    'jquery',
    'Buhmann_Catalog/js/navigation-pool',
    'Magento_Swatches/js/swatch-renderer'
], function (Component, ko, $, navigationPool) {
    'use strict';

    /**
     * Custom Knockout binding handler for Swatch Tooltips
     */
    ko.bindingHandlers.swatchTooltip = {
        init(element) {
            const $element = $(element);
            if (typeof $element.SwatchRendererTooltip === 'function') {
                $element.SwatchRendererTooltip();
            }
        }
    };

    return Component.extend({
        defaults: {
            attributeCode: '',
            items: []
        },

        /**
         * Component initialization
         */
        initialize() {
            this._super();

            this.observe(['items']);

            this.updateItemsFromPool(navigationPool.filtersData());
            navigationPool.filtersData.subscribe((allFilters) => {
                this.updateItemsFromPool(allFilters);
            });

            return this;
        },

        /**
         * Extract matched attribute nodes array from shared state registry
         *
         * @param {Array} allFilters
         */
        updateItemsFromPool(allFilters) {
            if (!allFilters || !Array.isArray(allFilters)) {
                return;
            }

            const matchedFilter = allFilters.find(filter => filter.code === this.attributeCode);
            if (matchedFilter && Array.isArray(matchedFilter.items)) {
                this.items(matchedFilter.items);
            } else {
                this.items([]);
            }
        },

        /**
         * Process navigation filter selection interceptors
         *
         * @param {Object} item
         * @param {Event} event
         */
        handleSwatchClick(item, event) {
            if (event) {
                event.preventDefault();
            }

            if (item.url) {
                navigationPool.navigate(item.url);
            }
        }
    });
});
