/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
define([
    'jquery',
    'mage/translate',
    'jquery-ui-modules/widget',
    'Magento_Catalog/js/catalog-add-to-cart'
], function($) {
    'use strict';

    $.widget('buhmann.infiniteScroll', {
        options: {
            productWrapper: '.products.list.items',
            productItem: '.product-item',
            nextBtn: '.pages-item-next a',
            pagination: '.pages',
            loaderImage: '',
            infiniteScroll: false,
            saveHistory: false,
        },

        _create: function () {
            this.isLoading = false;
            this.productWrapper = $(this.options.productWrapper);

            const urlParams = new URLSearchParams(window.location.search);
            const currentPage = parseInt(urlParams.get('p'));

            if (this.options.saveHistory && currentPage > 1) {
                this.loadPreviousPages(1, currentPage);
            }

            this._bindEvents();
        },

        _bindEvents: function () {
            this._on(window, {
                scroll: 'checkScrollPosition'
            });
        },

        checkScrollPosition: function () {
            const nextUrl = $(this.options.nextBtn).attr('href');
            const lastItem = $(this.options.productWrapper + ' ' + this.options.productItem).last();

            if (this.options.infiniteScroll && nextUrl && !this.isLoading && lastItem.length) {
                const rect = lastItem[0].getBoundingClientRect();

                if (rect.top <= window.innerHeight + 200) {
                    this.loadNextPage(nextUrl);
                }
            }
        },

        loadNextPage: function (url) {
            this.isLoading = true;

            const pagination = $(this.options.pagination);
            pagination.hide();

            if (!$('.scroll-loader-bottom').length) {
                this.productWrapper.after('<div class="scroll-loader-bottom">' + this._getLoaderHtml() + '</div>');
            }

            $.ajax({
                url: url,
                type: 'GET',
                success: (res) => {
                    const html = $(res);
                    const newProducts = html.find(this.options.productWrapper + ' ' + this.options.productItem);
                    const newNextUrl = html.find(this.options.nextBtn).attr('href');

                    if (newProducts.length) {
                        this.productWrapper.append(newProducts);

                        if (this.options.saveHistory) {
                            window.history.pushState({}, '', url);
                        }
                        this._runContentUpdated(newProducts);
                    }

                    if (newNextUrl) {
                        $(this.options.nextBtn).attr('href', newNextUrl);
                    } else {
                        $(this.options.nextBtn).remove();
                    }

                    $('.scroll-loader-bottom').remove();
                    this.isLoading = false;
                },
                error: () => {
                    $('.scroll-loader-bottom').remove();
                    this.isLoading = false;
                }
            });
        },

        loadPreviousPages: function (pageToLoad, stopAtPage) {
            if (pageToLoad >= stopAtPage) return;

            this.isLoading = true;

            const baseUrl = window.location.href.split('?')[0];
            const params = new URLSearchParams(window.location.search);
            params.set('p', pageToLoad);
            const loadUrl = baseUrl + '?' + params.toString();

            $.ajax({
                url: loadUrl,
                type: 'GET',
                beforeSend: () => {
                    $(this.options.pagination).hide();
                    if (!$('.scroll-loader-top').length) {
                        this.productWrapper.before('<div class="scroll-loader-top">' + this._getLoaderHtml() + '</div>');
                    }
                },
                success: (res) => {
                    const html = $(res);
                    const products = html.find(this.options.productWrapper + ' ' + this.options.productItem);

                    if (products.length) {
                        const firstCurrentItem = this.productWrapper.find('[data-page="' + (pageToLoad + 1) + '"]').first();

                        products.attr('data-page', pageToLoad);

                        if (firstCurrentItem.length) {
                            firstCurrentItem.before(products);
                        } else {
                            this.productWrapper.prepend(products);
                        }

                        this._runContentUpdated(products);
                    }

                    if (pageToLoad + 1 < stopAtPage) {
                        this.loadPreviousPages(pageToLoad + 1, stopAtPage);
                    } else {
                        $('.scroll-loader-top').remove();
                        this.isLoading = false;
                    }
                }
            });
        },

        _getLoaderHtml: function () {
            if (this.options.loaderImage !== '') {
                return '<div class="scroll-loader" style="text-align:center;"><img src="' + this.options.loaderImage + '" /></div>';
            }
            return '<div class="scroll-loader" style="text-align:center;">' + $.mage.__('Loading...') + '</div>';
        },

        _runContentUpdated: function (products) {
            $('body').trigger('contentUpdated');

            if (products && products.length) {
                products.each(function () {
                    const $item = $(this);

                    $item.find('[data-role=swatch-options]').each(function () {
                        if (!$(this).data('mage-swatchRenderer')) {
                            $(this).trigger('contentUpdated');
                        }
                    });

                    $item.find('form[data-role="tocart-form"]').catalogAddToCart();
                });
            }
        }
    });

    return $.buhmann.infiniteScroll;
});
