/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
define([
    'jquery'
], function ($) {
    'use strict';

    return function (targetWidget) {
        $.widget('mage.productListToolbarForm', targetWidget, {
            options: {
                ajaxNavigation: false,
                mainContentSelector: '.columns',
                productWrapperSelector: '.products.list.items',
                paginationSelector: '.pages',
                toolbarSelector: '.toolbar-products',
            },
            changeUrl: function (paramName, paramValue, defaultValue) {
                if (!this.options.ajaxNavigation) {
                    return this._super(paramName, paramValue, defaultValue);
                }

                const urlPaths = this.options.url.split('?');
                const baseUrl = urlPaths[0];
                const paramData = this.getUrlParams();

                paramData[paramName] = paramValue;
                if (paramValue === defaultValue) {
                    delete paramData[paramName];
                }

                delete paramData[this.options.page];

                const paramString = $.param(paramData);
                const targetUrl = baseUrl + (paramString.length ? '?' + paramString : '');

                this._ajaxSubmit(targetUrl);
            },

            _ajaxSubmit: function (url) {
                const self = this;

                $(this.options.productWrapperSelector).addClass('loading');

                $.ajax({
                    url: url,
                    type: 'GET',
                    success: function (res) {
                        const html = $(res);
                        const newMainContent = html.find(self.options.mainContentSelector);

                        if (newMainContent.length) {
                            $(self.options.mainContentSelector).replaceWith(newMainContent);
                        } else {
                            const newProducts = html.find(self.options.productWrapperSelector);
                            if (newProducts.length) {
                                $(self.options.productWrapperSelector).replaceWith(newProducts);
                            }

                            html.find(self.options.toolbarSelector).each(function (index) {
                                $(self.options.toolbarSelector).eq(index).replaceWith($(this));
                            });

                            const newPagination = html.find(self.options.paginationSelector);
                            if (newPagination.length) {
                                $(self.options.paginationSelector).replaceWith(newPagination).show();
                            } else {
                                $(self.options.paginationSelector).hide();
                            }
                        }

                        window.history.pushState({}, '', url);

                        $('body').trigger('contentUpdated');
                    },
                    error: function () {
                        window.location.href = url;
                    }
                });
            }
        });

        return $.mage.productListToolbarForm;
    };
});
