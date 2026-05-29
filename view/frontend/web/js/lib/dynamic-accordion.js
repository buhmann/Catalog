define([
    'jquery',
    'ko'
], function ($, ko) {
    'use strict';

    ko.bindingHandlers.dynamicAccordion = {
        init: (element, valueAccessor) => {
            // Unwrap the main binding object containing both data and config
            const bindingValues = ko.unwrap(valueAccessor()) || {};
            const filtersData = ko.unwrap(bindingValues.data) || [];
            const config = ko.unwrap(bindingValues.config) || {};
            const $element = $(element);

            const activeConfig = config.active;
            const initialActiveIndices = Array.isArray(activeConfig) ? activeConfig : [];

            // Initialize isolated state registry unique to this specific DOM element instance
            let stateRegistry = $element.data('accordion-states');
            if (!stateRegistry) {
                stateRegistry = {};
                $element.data('accordion-states', stateRegistry);
            }

            // Map backend numeric indices to unique text codes on initial element load
            if (filtersData.length > 0 && Object.keys(stateRegistry).length === 0) {
                filtersData.forEach((filter, index) => {
                    if (filter && filter.code) {
                        stateRegistry[filter.code] = !initialActiveIndices.includes(index);
                    }
                });
            }

            // Delegate click events with strict bubbling isolation per accordion element
            $element.on('click', '[data-ajax-role="title"]', function (event) {
                event.preventDefault();
                event.stopPropagation();

                const $title = $(this);
                const $item = $title.closest('[data-ajax-role="collapsible"]');
                const filterCode = $item.attr('data-filter-code');

                if ($item.hasClass('active')) {
                    $item.removeClass('active').addClass('is-closed');
                    $item.find('[data-ajax-role="content"]').hide();
                } else {
                    $item.removeClass('is-closed').addClass('active');
                    $item.find('[data-ajax-role="content"]').show();
                }

                if (filterCode) {
                    const currentRegistry = $element.data('accordion-states') || {};
                    currentRegistry[filterCode] = $item.hasClass('is-closed');
                }
            });
        },

        update: (element, valueAccessor) => {
            // Establish Knockout dependency tracking on the nested data observable
            const bindingValues = ko.unwrap(valueAccessor()) || {};
            const filtersData = ko.unwrap(bindingValues.data) || [];
            const config = ko.unwrap(bindingValues.config) || {};
            const $element = $(element);

            const activeConfig = config.active;
            const initialActiveIndices = Array.isArray(activeConfig) ? activeConfig : [];

            // Execute rendering adjustments after Knockout finishes building DOM tree elements
            ko.tasks.schedule(() => {
                const $items = $element.find('[data-ajax-role="collapsible"]');
                if (!$items.length) {
                    return;
                }

                let stateRegistry = $element.data('accordion-states');
                if (!stateRegistry) {
                    stateRegistry = {};
                    $element.data('accordion-states', stateRegistry);
                }

                if (Object.keys(stateRegistry).length === 0 && filtersData.length > 0) {
                    filtersData.forEach((filter, index) => {
                        if (filter && filter.code) {
                            stateRegistry[filter.code] = !initialActiveIndices.includes(index);
                        }
                    });
                }

                $items.each(function () {
                    const $item = $(this);
                    const filterCode = $item.attr('data-filter-code');

                    if (filterCode && stateRegistry.hasOwnProperty(filterCode)) {
                        const isCollapsed = stateRegistry[filterCode];

                        $item.toggleClass('is-closed', isCollapsed).toggleClass('active', !isCollapsed);
                        $item.find('[data-ajax-role="content"]').toggle(!isCollapsed);
                    }
                });
            });
        }
    };
});
