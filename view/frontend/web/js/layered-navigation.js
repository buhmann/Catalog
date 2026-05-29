define([
    'uiComponent',
    'jquery',
    'ko',
    'underscore',
    'Buhmann_Catalog/js/navigation-pool',
    'accordion',
], function (Component, $, ko, _, navigationPool) {
    'use strict';

    ko.bindingHandlers.dynamicAccordion = {
        update: (element, valueAccessor, allBindings) => {
            const filtersData = ko.utils.unwrapObservable(valueAccessor());
            const config = allBindings.get('accordionConfig') || {};
            const $element = $(element);
            const openedStateClass = config.openedState || 'active';

            const openedFilterCodes = [];
            $element.find('[data-role="collapsible"]').each(function () {
                const $item = $(this);
                const filterCode = $item.attr('data-filter-code');
                const isOpened = $item.hasClass('active') || $item.hasClass(openedStateClass);

                if (filterCode && $item.is(':visible') && isOpened) {
                    openedFilterCodes.push(filterCode);
                }

                const matchedData = filtersData.find(f => f.code === filterCode);
                if (matchedData) {
                    matchedData.isCollapsed = !isOpened;
                }
            });

            setTimeout(() => {
                $element.removeClass('mage-accordion-disabled');
                $element.removeData('mageAccordion').removeData('mage-accordion');
                $element.find('[data-role="collapsible"]').removeData('mageCollapsible').removeData('mage-collapsible');

                const finalActiveConfig = [];
                let visibleIndex = 0;

                $element.find('[data-role="collapsible"]').each(function () {
                    const $item = $(this);

                    if ($item.is(':visible')) {
                        const currentCode = $item.attr('data-filter-code');
                        const $title = $item.find('[data-role="title"]');
                        const $content = $item.find('[data-role="content"]');

                        if (openedFilterCodes.length > 0) {
                            if (openedFilterCodes.includes(currentCode)) {
                                finalActiveConfig.push(visibleIndex);
                                $item.addClass(openedStateClass).removeClass('is-closed');
                                $title.addClass(openedStateClass).attr('aria-selected', 'true').attr('aria-expanded', 'true');
                                $content.addClass(openedStateClass).show().attr('aria-hidden', 'false');
                            } else {
                                $item.removeClass(openedStateClass).addClass('is-closed');
                                $title.removeClass(openedStateClass).attr('aria-selected', 'false').attr('aria-expanded', 'false');
                                $content.removeClass(openedStateClass).hide().attr('aria-hidden', 'true');
                            }
                        }
                        visibleIndex++;
                    }
                });

                if (openedFilterCodes.length === 0) {
                    if (config.active !== undefined && config.active !== false) {
                        const defaultActive = Array.isArray(config.active) ? config.active : [config.active];

                        $element.find('[data-role="collapsible"]:visible').each(function (index) {
                            const $item = $(this);
                            const $title = $item.find('[data-role="title"]');
                            const $content = $item.find('[data-role="content"]');

                            if (defaultActive.includes(index)) {
                                finalActiveConfig.push(index);
                                $item.addClass(openedStateClass).removeClass('is-closed');
                                $title.addClass(openedStateClass).attr('aria-selected', 'true').attr('aria-expanded', 'true');
                                $content.addClass(openedStateClass).show().attr('aria-hidden', 'false');
                            } else {
                                $item.removeClass(openedStateClass).addClass('is-closed');
                                $title.removeClass(openedStateClass).attr('aria-selected', 'false').attr('aria-expanded', 'false');
                                $content.removeClass(openedStateClass).hide().attr('aria-hidden', 'true');
                            }
                        });
                    } else if (config.multipleCollapsible) {
                        $element.find('[data-role="collapsible"]:visible').each(function (index) {
                            finalActiveConfig.push(index);
                            const $item = $(this);
                            $item.addClass(openedStateClass).removeClass('is-closed');
                            $item.find('[data-role="title"]').addClass(openedStateClass).attr('aria-selected', 'true').attr('aria-expanded', 'true');
                            $item.find('[data-role="content"]').addClass(openedStateClass).show().attr('aria-hidden', 'false');
                        });
                    }
                }

                $element.accordion({
                    openedState: openedStateClass,
                    collapsible: config.collapsible !== undefined ? config.collapsible : true,
                    multipleCollapsible: config.multipleCollapsible !== undefined ? config.multipleCollapsible : true,
                    active: finalActiveConfig,
                    animate: false,
                    scrollToTop: false
                });

                $element.off('click', '[data-role="title"]').on('click', '[data-role="title"]', (event) => {
                    if (event.originalEvent) {
                        event.originalEvent.preventDefault();
                        event.originalEvent.stopPropagation();
                    }
                    event.preventDefault();
                    event.stopPropagation();
                });
            }, 0);
        }
    };

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
