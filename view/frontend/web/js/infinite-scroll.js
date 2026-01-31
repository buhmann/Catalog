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
        }, options);
        let isLoading = false;
        const productWrapper = $(config.productWrapper);

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

        function loadNextPage(url) {
            isLoading = true;
            const pagination = $(config.pagination);

            pagination.hide();

            if (config.loaderImage !== '') {
                productWrapper.after('<div class="scroll-loader" style="text-align:center;"><img src="'+config.loaderImage+'" /></div>');
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

                        window.history.pushState({}, '', url);

                        $('body').trigger('contentUpdated');

                        newProducts.each(function () {
                            const $item = $(this);

                            $item.find('[data-role=swatch-options]').each(function () {
                                if (!$(this).data('mage-swatchRenderer')) {
                                    $(this).trigger('contentUpdated');
                                }
                            });

                            $item.find('form[data-role="tocart-form"]').catalogAddToCart();
                        });
                    }

                    if (newNextUrl) {
                        $(config.nextBtn).attr('href', newNextUrl);
                    } else {
                        $(config.nextBtn).remove();
                    }

                    $('.scroll-loader').remove();
                    isLoading = false;
                },
                error: function () {
                    $('.scroll-loader').remove();
                    isLoading = false;
                }
            });
        }
    };
});
