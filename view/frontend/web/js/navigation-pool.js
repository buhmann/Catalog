define([
    'jquery',
    'ko',
    'underscore'
], function ($, ko, _) {
    'use strict';

    const NavigationPool = function () {
        this.isLoading = ko.observable(false);
        this.filtersData = ko.observableArray([]);
        this.activeFilters = ko.observableArray([]);
        this.productsHtml = ko.observable('');
        this.toolbarHtml = ko.observable('');
        this.paginationHtml = ko.observable('');
    };

    /**
     * @param {String} url
     * @param {Object} options {
     *     mode: 'replace', // Possible values: 'replace', 'append', 'prepend'
     *     excludeUrlParams: [] // Array of query parameter keys to strip from browser history
     * }
     */
    NavigationPool.prototype.navigate = function (url, options = {}) {
        if (this.isLoading()) {
            return;
        }

        const settings = Object.assign({
            mode: 'replace',
            excludeUrlParams: []
        }, options);

        this.isLoading(true);
        $('body').addClass('ajax-loading');

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            data: { isAjax: 1 },
            success: (response) => {
                if (response.success) {
                    if (response.filters && Array.isArray(response.filters)) {
                        const previousFilters = this.filtersData() || [];

                        // Identify filters that exist on UI but are missing in the new server response
                        previousFilters.forEach((oldFilter) => {
                            const isStillPresent = _.some(response.filters, (newFilter) => {
                                return newFilter.code === oldFilter.code;
                            });

                            // If the attribute is completely excluded by the engine, clear its items to hide it
                            if (!isStillPresent) {
                                response.filters.push({
                                    code: oldFilter.code,
                                    name: oldFilter.name,
                                    items: [],
                                    maxSize: 0
                                });
                            }
                        });

                        this.filtersData(response.filters);
                    }

                    if (response.activeFilters) {
                        this.activeFilters(response.activeFilters);
                    }

                    this.toolbarHtml(response.toolbar);
                    this.paginationHtml(response.pagination);

                    this.productsHtml({
                        html: response.products,
                        url: url,
                        options: settings
                    });

                    if (window.history) {
                        const cleanUrlObj = new URL(url, window.location.origin);
                        cleanUrlObj.searchParams.delete('isAjax');
                        cleanUrlObj.searchParams.delete('_');

                        if (Array.isArray(settings.excludeUrlParams)) {
                            settings.excludeUrlParams.forEach(function (param) {
                                cleanUrlObj.searchParams.delete(param);
                            });
                        }

                        const targetHistoryUrl = cleanUrlObj.toString();

                        if (settings.mode === 'replace' && window.history.pushState) {
                            window.history.pushState({}, '', targetHistoryUrl);
                        } else if (window.history.replaceState) {
                            window.history.replaceState({}, '', targetHistoryUrl);
                        }
                    }
                } else {
                    window.location.href = url;
                }
            },
            error: function () {
                window.location.href = url;
            },
            complete: () => {
                this.isLoading(false);
                $('body').removeClass('ajax-loading');
            }
        });
    };

    return new NavigationPool();
});
