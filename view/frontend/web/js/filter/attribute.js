define([
    'uiComponent',
    'ko',
    'underscore',
    'jquery',
    'Buhmann_Catalog/js/navigation-pool'
], (Component, ko, _, $, navigationPool) => {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'Buhmann_Catalog/layer/filter/attribute',
            filterCode: '',
            items: [],
            maxSize: 10,
            hasMoreItems: false,
            displayProductCount: true,
            isMultiSelect: false,
            showMoreLabel: $.mage.__('Show more'),
            showLessLabel: $.mage.__('Show less'),
        },

        /**
         * Initialize component
         */
        initialize() {
            this._super();

            this.filterRefreshTrigger = ko.observable(0);
            this.visible = ko.observable(true);
            this.expanded = ko.observable(false);

            this.observe(['expanded']);

            this.updateItemsFromPool(navigationPool.filtersData());
            navigationPool.filtersData.subscribe((allFilters) => {
                this.updateItemsFromPool(allFilters);
            });

            this.onShowLess();

            return this;
        },

        /**
         * Update items from navigation pool
         */
        updateItemsFromPool(allFilters) {
            if (!allFilters || !Array.isArray(allFilters)) {
                return;
            }

            const matchedFilter = _.find(allFilters, (filter) => {
                return filter.code === this.filterCode;
            });

            if (matchedFilter) {
                if (!matchedFilter.items || matchedFilter.items.length === 0) {
                    this.items = [];
                    this.visible(false);
                    this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
                    return;
                }

                this.visible(true);

                if (matchedFilter.maxSize) {
                    this.maxSize = parseInt(matchedFilter.maxSize, 10);
                }
                this.hasMoreItems = matchedFilter.hasMoreItems || false;
                this.displayProductCount = matchedFilter.displayProductCount || true;
                this.isMultiSelect = matchedFilter.isMultiSelect || false;

                const mappedItems = matchedFilter.items.map((item) => ({
                    label: item.label,
                    count: item.count,
                    url: item.url,
                    is_selected: item.is_selected,
                    value: item.value,
                    swatch_value: item.swatch_value,
                    swatch_type: item.swatch_type
                }));

                this.items = mappedItems;

                const lastSelectedIndex = Math.max.apply(
                    null,
                    mappedItems.map((v, k) => v.is_selected ? k : 0)
                );
                this.maxSize = Math.max(this.maxSize, lastSelectedIndex + 1);

                this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
            }
        },

        /**
         * Get displayed items
         */
        getDisplayedItems() {
            if (this.filterRefreshTrigger) {
                this.filterRefreshTrigger();
            }

            if (!this.items || !this.items.length) {
                return [];
            }

            if (this.expanded()) {
                return this.items;
            }

            return this.items.slice(0, this.maxSize);
        },

        /**
         * Check if expansion is enabled
         */
        enableExpansion() {
            if (this.filterRefreshTrigger) {
                this.filterRefreshTrigger();
            }

            return this.hasMoreItems || this.items.length > this.maxSize;
        },

        /**
         * Display show more
         */
        displayShowMore() {
            return this.enableExpansion() && this.expanded() === false;
        },

        /**
         * Display show less
         */
        displayShowLess() {
            return this.enableExpansion() && this.expanded() === true;
        },

        /**
         * Handle show more click
         */
        onShowMore(data, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            if (this.hasMoreItems) {
                this.expanded(true);
                this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
                return;
            }

            this.expanded(true);
            this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
        },

        /**
         * Handle show less click
         */
        onShowLess(data, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            this.expanded(false);
            this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
        },

        /**
         * Handle navigation click
         */
        handleNavigation(item, event) {
            if (event) {
                event.preventDefault();
            }

            if (item && item.url) {
                navigationPool.navigate(item.url);
            }
            return false;
        }
    });
});
