define([
    'jquery',
    'underscore',
    'ko',
    'Buhmann_Catalog/js/navigation-pool'
], function ($, _, ko, navigationPool) {
    'use strict';

    return function (originalComponent) {
        return originalComponent.extend({
            /**
             * Extends initialization to add pool stream subscription and dynamic visibility controls
             */
            initialize: function () {
                // Create a dedicated knockout observable to act as a rendering dependency trigger
                this.filterRefreshTrigger = ko.observable(0);
                this.visible = ko.observable(true);

                this._super();

                navigationPool.filtersData.subscribe(allFilters => {
                    if (!allFilters || !Array.isArray(allFilters)) {
                        return;
                    }

                    // Flexible matching checking code, name or fallback to substring
                    const matchingFilter = _.find(allFilters, filter => {
                        return filter.code === this.index ||
                            filter.name === this.index ||
                            (this.index && this.index.indexOf(filter.code) === 0) ||
                            filter.code === this.filterCode;
                    });

                    if (matchingFilter) {
                        if (!matchingFilter.items || matchingFilter.items.length === 0) {
                            this.items = [];
                            if (typeof this.visible === 'function') {
                                this.visible(false);
                            }
                            this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
                            return;
                        }

                        // If items returned, make sure the filter block container is visible
                        if (typeof this.visible === 'function') {
                            this.visible(true);
                        }

                        if (matchingFilter.maxSize) {
                            this.maxSize = parseInt(matchingFilter.maxSize, 10);
                        }

                        // Map raw item values directly into standard structure using native Smile method
                        const mappedItems = matchingFilter.items.map(this.addItemId.bind(this));

                        // Dynamically update standard native array holding current active options
                        this.items = mappedItems;

                        // Ensure expanded viewport bounds can accommodate any selected checkbox elements
                        const lastSelectedIndex = Math.max.apply(null, (mappedItems.map(
                            function (v, k) { return v['is_selected'] ? k : 0; }
                        )));
                        this.maxSize = Math.max(this.maxSize, lastSelectedIndex + 1);

                        // Trigger view re-evaluation to dynamically toggle ShowMore visibility state
                        this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
                    }
                });
            },

            /**
             * Intercepts items sent to the rendering loop to attach custom AJAX navigation behaviors
             *
             * @returns {Array}
             */
            getDisplayedItems: function () {
                if (this.filterRefreshTrigger) {
                    this.filterRefreshTrigger();
                }

                const items = this._super();

                // Re-bind click event handlers for checkboxes inside the next animation
                if (items && items.length) {
                    setTimeout(function () {
                        items.forEach(function (item) {
                            if (item.id) {
                                const $link = $('#' + item.id).closest('a');
                                if ($link.length) {
                                    $link.off('click.ajaxFilter').on('click.ajaxFilter', function (event) {
                                        const targetUrl = $(this).attr('href');
                                        if (targetUrl) {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            navigationPool.navigate(targetUrl);
                                        }
                                    });
                                }
                            }
                        });
                    }, 0);
                }

                return items;
            },

            /**
             * Check if the expansion layout wrappers should be displayed dynamically based on total list length
             *
             * @returns {Boolean}
             */
            enableExpansion: function () {
                if (this.filterRefreshTrigger) {
                    this.filterRefreshTrigger();
                }

                const itemsCount = this.items ? this.items.length : 0;
                const limitSize = this.maxSize || 10;

                return itemsCount > limitSize;
            },

            /**
             * Callback for the "Show more" button
             * @param {Object} data - Element context scope
             * @param {Event} event - UI interaction event payload
             */
            onShowMore: function (data, event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                this.expanded(true);
                if (this.filterRefreshTrigger) {
                    this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
                }
            },

            /**
             * Callback for the "Show less" button
             * @param {Object} data - Element context scope
             * @param {Event} event - UI interaction event payload
             */
            onShowLess: function (data, event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                this.expanded(false);
                if (this.filterRefreshTrigger) {
                    this.filterRefreshTrigger(this.filterRefreshTrigger() + 1);
                }
            }
        });
    };
});
