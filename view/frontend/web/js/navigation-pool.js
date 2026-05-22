define([
    'jquery',
    'ko'
], function ($, ko) {
    'use strict';

    const NavigationPool = function () {
        this.isLoading = ko.observable(false);
        this.filtersData = ko.observableArray([]);
        this.productsHtml = ko.observable('');
        this.toolbarHtml = ko.observable('');
        this.paginationHtml = ko.observable('');
    };

    /**
     * @param {String} url
     * @param isAppend
     */
    NavigationPool.prototype.navigate = function (url, isAppend) {
        if (this.isLoading()) {
            return;
        }

        this.isLoading(true);
        $('body').addClass('ajax-loading');

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            data: { isAjax: 1 },
            success: (response) => {
                if (response.success) {
                    if (response.filters) {
                        this.filtersData(response.filters);
                    }

                    this.toolbarHtml(response.toolbar);
                    this.paginationHtml(response.pagination);

                    this.productsHtml({
                        html: response.products,
                        url: url,
                        append: !!isAppend
                    });

                    if (window.history && window.history.pushState) {
                        const cleanUrlObj = new URL(url, window.location.origin);
                        cleanUrlObj.searchParams.delete('isAjax');
                        cleanUrlObj.searchParams.delete('_');
                        window.history.pushState({}, '', cleanUrlObj.toString());
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
