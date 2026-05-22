define([
    'jquery',
    'Buhmann_Catalog/js/navigation-pool'
], function ($, navigationPool) {
    'use strict';

    return function (targetWidget) {
        $.widget('mage.productListToolbarForm', targetWidget, {
            options: {
                ajaxNavigation: false,
                paginationSelector: '.pages',
            },

            _create: function () {
                if (!this.options.ajaxNavigation) {
                    return this._super();
                }

                const self = this;

                // 1. Pagination links click handling
                $('body').off('click', this.options.paginationSelector + ' a')
                    .on('click', this.options.paginationSelector + ' a', function (e) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const url = $(this).attr('href');
                        if (url) {
                            navigationPool.navigate(url);
                        }
                    });

                // 2. Grid/List mode switcher
                $('body').off('click', this.options.modeControl)
                    .on('click', this.options.modeControl, function (e) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const selectedMode = $(this).data('value');

                        if (selectedMode) {
                            const urlParams = new URLSearchParams(window.location.search);
                            urlParams.delete('_');
                            urlParams.delete('isAjax');
                            urlParams.delete(self.options.page);
                            urlParams.delete(self.options.limit);

                            urlParams.set(self.options.mode, selectedMode);

                            const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
                            const queryString = urlParams.toString();
                            const targetUrl = baseUrl + (queryString.length ? '?' + queryString : '');

                            self.options.url = targetUrl;
                            navigationPool.navigate(targetUrl);
                        }
                    });

                // 3. Sort By dropdown selection handling
                this.element.find(this.options.orderControl).off('change').on('change', function (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    self.processParamUpdate(self.options.order, $(this).val());
                });

                // 4. Limiter dropdown selection handling (Show per page)
                this.element.find(this.options.limitControl).off('change').on('change', function (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    self.processParamUpdate(self.options.limit, $(this).val());
                });

                // 5. Sort Direction switcher (Ascending/Descending)
                this.element.find(this.options.directionControl).off('click').on('click', function (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const selectedDirection = $(this).data('value');
                    if (selectedDirection) {
                        self.processParamUpdate(self.options.direction, selectedDirection);
                    }
                });
            },

            /**
             * @param {String} paramName
             * @param {*} paramValue
             * @param {*} defaultValue
             */
            changeUrl: function (paramName, paramValue, defaultValue) {
                if (!this.options.ajaxNavigation) {
                    return this._super(paramName, paramValue, defaultValue);
                }
                this.processParamUpdate(paramName, paramValue);
            },

            /**
             * @param {String} paramName
             * @param {*} paramValue
             */
            processParamUpdate: function (paramName, paramValue) {
                const urlParams = new URLSearchParams(window.location.search);

                urlParams.delete('_');
                urlParams.delete('isAjax');

                urlParams.set(paramName, paramValue);
                urlParams.delete(this.options.page);

                const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
                const queryString = urlParams.toString();
                const targetUrl = baseUrl + (queryString.length ? '?' + queryString : '');

                this.options.url = targetUrl;

                this._ajaxSubmit(targetUrl);
            },

            /**
             * @param {String} url
             */
            _ajaxSubmit: function (url) {
                if (!this.options.ajaxNavigation) {
                    return this._super(url);
                }
                navigationPool.navigate(url);
            }
        });

        return $.mage.productListToolbarForm;
    };
});
