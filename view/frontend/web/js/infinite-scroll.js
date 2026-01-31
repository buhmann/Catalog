/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
define([
    'jquery',
    'mage/translate'
], function($) {
    'use strict';

    return function (options) {
        let config = $.extend({
            productWrapper: '.products.list.items',
            productItem: '.product-item',
            nextBtn: '.pages-item-next a',
            pagination: '.pages',
            loaderImage: '',
            saveHistory: false,
        }, options);

        let isLoading = false;
        const productWrapper = $(config.productWrapper);
        const getLoaderHtml = function () {
            if (config.loaderImage !== '') {
                return '<div class="scroll-loader" style="text-align:center;"><img src="' + config.loaderImage + '" /></div>';
            }
            return '<div class="scroll-loader" style="text-align:center;">' + $.mage.__('Loading...') + '</div>';
        }

        const runContentUpdated = function (products) {
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

        const init = function() {
            const urlParams = new URLSearchParams(window.location.search);
            const currentPage = parseInt(urlParams.get('p'));

            if (config.saveHistory && currentPage > 1) {
                loadPreviousPages(1, currentPage);
            }
        };

        function loadPreviousPages(pageToLoad, stopAtPage) {
            if (pageToLoad >= stopAtPage) return;

            isLoading = true;
            const baseUrl = window.location.href.split('?')[0];
            const params = new URLSearchParams(window.location.search);
            params.set('p', pageToLoad);
            const loadUrl = baseUrl + '?' + params.toString();

            $.ajax({
                url: loadUrl,
                type: 'GET',
                beforeSend: function() {
                    $(config.pagination).hide();
                    if (!$('.scroll-loader-top').length) {
                        productWrapper.before('<div class="scroll-loader-top">' + getLoaderHtml() + '</div>');
                    }
                },
                success: function (res) {
                    const html = $(res);
                    const products = html.find(config.productWrapper + ' ' + config.productItem);

                    if (products.length) {
                        const firstCurrentItem = productWrapper.find('[data-page="' + (pageToLoad + 1) + '"]').first();

                        products.attr('data-page', pageToLoad);

                        if (firstCurrentItem.length) {
                            firstCurrentItem.before(products);
                        } else {
                            productWrapper.prepend(products);
                        }

                        runContentUpdated(products);
                    }

                    if (pageToLoad + 1 < stopAtPage) {
                        loadPreviousPages(pageToLoad + 1, stopAtPage);
                    } else {
                        $('.scroll-loader-top').remove();
                        isLoading = false;
                    }
                }
            });
        }

        function loadNextPage(url) {
            isLoading = true;
            const pagination = $(config.pagination);

            pagination.hide();

            if (!$('.scroll-loader-bottom').length) {
                productWrapper.after('<div class="scroll-loader-bottom">' + getLoaderHtml() + '</div>');
            }

            $.ajax({
                url: url,
                type: 'GET',
                success: function (res) {
                    const html = $(res);
                    const newProducts = html.find(config.productWrapper + ' ' + config.productItem);
                    const newNextUrl = html.find(config.nextBtn).attr('href');

                    if (newProducts.length) {
                        productWrapper.append(newProducts);

                        if (config.saveHistory) {
                            window.history.pushState({}, '', url);
                        }
                        runContentUpdated(newProducts);
                    }

                    if (newNextUrl) {
                        $(config.nextBtn).attr('href', newNextUrl);
                    } else {
                        $(config.nextBtn).remove();
                    }

                    $('.scroll-loader-bottom').remove();
                    isLoading = false;
                },
                error: function () {
                    $('.scroll-loader-bottom').remove();
                    isLoading = false;
                }
            });
        }

        $(window).on('scroll', function () {
            const nextUrl = $(config.nextBtn).attr('href');
            const lastItem = $(config.productWrapper + ' ' + config.productItem).last();

            if (nextUrl && !isLoading && lastItem.length) {
                const rect = lastItem[0].getBoundingClientRect();

                if (rect.top <= window.innerHeight + 200) {
                    loadNextPage(nextUrl);
                }
            }
        });

        init();
    };
});
