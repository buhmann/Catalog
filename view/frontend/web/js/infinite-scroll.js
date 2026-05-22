/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
define([
    'jquery',
    'mage/translate',
    'Buhmann_Catalog/js/navigation-pool',
    'jquery-ui-modules/widget',
    'Magento_Catalog/js/catalog-add-to-cart'
], function($, $t, navigationPool) {
    'use strict';

    $.widget('buhmann.infiniteScroll', {
        options: {
            bodyClass: 'products-infinite-scroll',
            productWrapper: '.products.list.items',
            productItem: '.product-item',
            nextBtn: '.pages-item-next a',
            pagination: '.pages',
            loaderTopWrapper: '.scroll-loader-top',
            loaderBottomWrapper: '.scroll-loader-bottom',
            loaderImage: '',
            infiniteScroll: false,
            savePageHistory: false,
            pageParam: 'p',
        },

        _create: function () {
            this.isLoading = false;

            const urlParams = new URLSearchParams(window.location.search);
            const currentPage = parseInt(urlParams.get(this.options.pageParam));

            if (this.options.infiniteScroll) {
                $('body').addClass(this.options.bodyClass);
            }

            if (this.options.savePageHistory && currentPage > 1) {
                this.loadPreviousPages(currentPage - 1, currentPage);
            }

            this._bindEvents();
        },

        _bindEvents: function () {
            $(window).off('scroll.infiniteScroll');

            $(window).on('load scroll.infiniteScroll', () => {
                this.checkScrollPosition();
            });

            navigationPool.productsHtml.subscribe(() => {
                $(this.options.loaderBottomWrapper).remove();
                $(this.options.loaderTopWrapper).remove();
                this.isLoading = false;
            });
        },

        _destroy: function () {
            $(window).off('scroll.infiniteScroll');

            this._super();
        },

        checkScrollPosition: function () {
            if (this.isLoading || !this.options.infiniteScroll) {
                return;
            }

            const nextUrl = $(this.options.nextBtn).attr('href');
            const lastItem = $(this.options.productWrapper + ' ' + this.options.productItem).last();

            if (nextUrl && lastItem.length) {
                const rect = lastItem[0].getBoundingClientRect();

                if (rect.top <= window.innerHeight + 200) {
                    this.loadNextPage(nextUrl);
                }
            }
        },

        /**
         * Fetches next page and strictly separates visual history state from requested URL
         * @param {String} url
         */
        loadNextPage: function (url) {
            if (!url || this.isLoading) return;
            this.isLoading = true;

            if (!$(this.options.loaderBottomWrapper).length) {
                $(this.options.productWrapper).after(
                    '<div class="' + this.options.loaderBottomWrapper.replace(/\./g, "") + '">' +
                        this._getLoaderHtml() +
                    '</div>'
                );
            }

            const excludeParams = [];
            if (!this.options.savePageHistory) {
                excludeParams.push(this.options.pageParam);
            }

            navigationPool.navigate(url, {
                mode: 'append',
                excludeUrlParams: excludeParams
            });
        },

        /**
         * Reconstitutes previous pages history backwards from current page down to page 1
         * @param {Number|String} pageToLoad
         * @param {Number|String} stopAtPage
         */
        loadPreviousPages: function (pageToLoad, stopAtPage) {
            if (pageToLoad < 1) {
                $(this.options.loaderTopWrapper).remove();
                this.isLoading = false;
                return;
            }

            this.isLoading = true;

            if (!$(this.options.loaderTopWrapper).length) {
                $(this.options.productWrapper).before(
                    '<div class="' + this.options.loaderTopWrapper.replace(/\./g, "") + '">' +
                        this._getLoaderHtml() +
                    '</div>'
                );
            }

            const baseUrl = window.location.href.split('?')[0];
            const params = new URLSearchParams(window.location.search);
            params.set(this.options.pageParam, pageToLoad);
            const loadUrl = baseUrl + '?' + params.toString();

            const currentSubscription = navigationPool.productsHtml.subscribe(() => {
                currentSubscription.dispose();
                setTimeout(() => {
                    this.loadPreviousPages(pageToLoad - 1, stopAtPage);
                }, 10);
            });

            navigationPool.navigate(loadUrl, {
                mode: 'prepend',
                excludeUrlParams: [this.options.pageParam]
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
