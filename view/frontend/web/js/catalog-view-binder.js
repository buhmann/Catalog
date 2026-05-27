define([
    'jquery',
    'uiComponent',
    'Buhmann_Catalog/js/navigation-pool'
], function ($, Component, navigationPool) {
    'use strict';

    return Component.extend({
        defaults: {
            options: {
                orderParam: 'product_list_order',
                limitParam: 'product_list_limit',
                pageParam: 'p',
            },
            selectors: {
                productWrapper: '.products.list.items',
                productGrid: '.products.products-grid, .products.products-list',
                productItem: '.product-item',
                nextBtn: '.pages-item-next a',
                toolbar: '.toolbar-products',
                pagination: '.pages',
                modes: '.modes',
                directionControl: '[data-role="direction-switcher"]',
                toolbarAmount: '.toolbar-amount',
                limiter: '.limiter',
                limitControl: '[data-role="limiter"]',
                orderControl: '[data-role="sorter"]',
                swatchOptions: '[data-role=swatch-options]',
            }
        },

        initialize: function () {
            this._super();
            this.initPoolSubscribers();

            navigationPool.navigate(window.location.href);

            return this;
        },

        initPoolSubscribers: function () {
            navigationPool.productsHtml.subscribe(data => {
                if (!data || !data.html) {
                    return;
                }

                const responseHtml = $('<div>').html(data.html);
                const requestUrl = data.url || window.location.href;
                const urlParams = new URLSearchParams(requestUrl.substring(requestUrl.indexOf('?')));

                urlParams.delete('_');
                urlParams.delete('isAjax');

                const options = data.options || { mode: 'replace' };

                if (options.mode === 'append') {
                    this.appendProducts(responseHtml, data.html);
                    return;
                }

                if (options.mode === 'prepend') {
                    this.prependProducts(responseHtml, data.html, urlParams);
                    return;
                }

                // Default replacing logic for full page updates
                this.updateProductsGrid(responseHtml);
                this.updatePagination();
                this.updateDisplayElements(responseHtml);
                this.updateToolbarTotals(responseHtml);
                this.reinitToolbarWidget(requestUrl, urlParams);
                this.toggleToolbarVisibility(responseHtml);
                this.reinitSwatches();

                document.body.dispatchEvent(new CustomEvent('contentUpdated'));
            });
        },

        /**
         * Appends product nodes to collection grid list container
         * @param {jQuery} responseHtml
         * @param {String} rawHtml
         */
        appendProducts: function (responseHtml, rawHtml) {
            const $wrapper = $(this.selectors.productWrapper);
            const incomingProducts = responseHtml.find(this.selectors.productWrapper + ' ' + this.selectors.productItem);
            const $newProducts = incomingProducts.length ? incomingProducts : $(rawHtml).find(this.selectors.productItem);

            if ($wrapper.length && $newProducts.length) {
                $wrapper.append($newProducts);
                this.updatePagination(responseHtml);
                this.reinitSwatches();
            }

            const $currentNextBtn = $(this.selectors.nextBtn);
            const newNextUrl = responseHtml.find(this.selectors.nextBtn).attr('href');

            if (newNextUrl && $currentNextBtn.length) {
                $currentNextBtn.attr('href', newNextUrl);
            } else {
                $currentNextBtn.remove();
            }

            $('body').trigger('contentUpdated');
            document.body.dispatchEvent(new CustomEvent('contentUpdated'));
        },

        /**
         * Prepends backward collection records history to target view area
         * @param {jQuery} responseHtml
         * @param {String} rawHtml
         * @param {URLSearchParams} urlParams
         */
        prependProducts: function (responseHtml, rawHtml, urlParams) {
            const $wrapper = $(this.selectors.productWrapper);
            const incomingProducts = responseHtml.find(this.selectors.productWrapper + ' ' + this.selectors.productItem);
            const $newProducts = incomingProducts.length ? incomingProducts : $(rawHtml).find(this.selectors.productItem);

            if ($wrapper.length && $newProducts.length) {
                const currentPageNum = parseInt(urlParams.get(this.options.pageParam)) || 1;
                $newProducts.attr('data-page', currentPageNum);

                $wrapper.prepend($newProducts);
                this.updatePagination(responseHtml);
                this.reinitSwatches();
            }

            $('body').trigger('contentUpdated');
            document.body.dispatchEvent(new CustomEvent('contentUpdated'));
        },

        /**
         * Clears standard catalog matrix block and replaces with updated nodes
         * @param {jQuery} responseHtml
         */
        updateProductsGrid: function (responseHtml) {
            const $newGridContainer = responseHtml.find(this.selectors.productGrid);
            const $targetGrid = $(this.selectors.productGrid);

            if ($targetGrid.length) {
                if ($newGridContainer.length) {
                    $targetGrid.replaceWith($newGridContainer);
                } else {
                    $targetGrid.html(responseHtml.html());
                }
            } else {
                const $newProducts = responseHtml.find(this.selectors.productWrapper);
                if ($newProducts.length) {
                    $(this.selectors.productWrapper).replaceWith($newProducts);
                }
            }

            $('body').trigger('contentUpdated');
        },

        /**
         * Synch and position current pagination markers inside layout toolbar
         */
        updatePagination: function () {
            if (!navigationPool.paginationHtml()) {
                return;
            }

            const incomingPager = $('<div>').html(navigationPool.paginationHtml());
            const $newPagination = incomingPager.find(this.selectors.pagination).length
                ? incomingPager.find(this.selectors.pagination)
                : incomingPager;

            if (!$newPagination.length) {
                return;
            }

            const $currentPagination = $(this.selectors.toolbar).find(this.selectors.pagination);

            if ($currentPagination.length) {
                $currentPagination.replaceWith($newPagination).show();
            } else {
                const $targetLimiter = $(this.selectors.toolbar).last().find(this.selectors.limiter);
                const $targetAmount = $(this.selectors.toolbar).last().find(this.selectors.toolbarAmount);

                if ($targetLimiter.length) {
                    $newPagination.insertBefore($targetLimiter);
                } else if ($targetAmount.length) {
                    $newPagination.insertAfter($targetAmount);
                } else {
                    $(this.selectors.toolbar).last().prepend($newPagination);
                }
                $newPagination.show();
            }
        },

        /**
         * Rebuild display profile options configuration links
         * @param {jQuery} responseHtml
         */
        updateDisplayElements: function (responseHtml) {
            const $incomingModes = responseHtml.find(this.selectors.modes).addBack(this.selectors.modes);
            if ($incomingModes.length && $(this.selectors.toolbar).find(this.selectors.modes).length) {
                $(this.selectors.toolbar).find(this.selectors.modes).replaceWith($incomingModes.clone());
            }

            const $incomingDirection = responseHtml.find(this.selectors.directionControl).addBack(this.selectors.directionControl);
            if ($incomingDirection.length && $(this.selectors.toolbar).find(this.selectors.directionControl).length) {
                $(this.selectors.toolbar).find(this.selectors.directionControl).replaceWith($incomingDirection.clone());
            }
        },

        /**
         * Refresh total amount texts and item counting variables
         * @param {jQuery} responseHtml
         */
        updateToolbarTotals: function (responseHtml) {
            const incomingToolbar = responseHtml.find(this.selectors.toolbar);
            if (!incomingToolbar.length) {
                return;
            }

            const $incomingAmount = incomingToolbar.find(this.selectors.toolbarAmount).addBack(this.selectors.toolbarAmount);
            const $incomingLimiter = incomingToolbar.find(this.selectors.limiter).addBack(this.selectors.limiter);

            if ($incomingAmount.length && $(this.selectors.toolbar).find(this.selectors.toolbarAmount).length) {
                $(this.selectors.toolbar).find(this.selectors.toolbarAmount).html($incomingAmount.html());
            }

            if ($incomingLimiter.length && $(this.selectors.toolbar).find(this.selectors.limiter).length) {
                $(this.selectors.toolbar).find(this.selectors.limiter).replaceWith($incomingLimiter.clone());
            }
        },

        /**
         * Bind toolbar controls form widget hooks
         * @param {String} requestUrl
         * @param {URLSearchParams} urlParams
         */
        reinitToolbarWidget: function (requestUrl, urlParams) {
            if (!$.fn.productListToolbarForm) {
                return;
            }

            const self = this;
            const cleanBaseUrl = requestUrl.split('?')[0];
            const cleanQuery = urlParams.toString();
            const cleanWidgetUrl = cleanBaseUrl + (cleanQuery.length ? '?' + cleanQuery : '');

            $(this.selectors.toolbar).each(function () {
                const $toolbar = $(this);

                $toolbar.removeData('mageProductListToolbarForm');
                $toolbar.off();

                $toolbar.productListToolbarForm({
                    ajaxNavigation: true,
                    url: cleanWidgetUrl,
                    mainContentSelector: '.columns',
                    productWrapperSelector: self.selectors.productWrapper,
                    paginationSelector: self.selectors.pagination,
                    toolbarSelector: self.selectors.toolbar
                });

                const widgetInstance = $toolbar.data('mageProductListToolbarForm');
                if (widgetInstance) {
                    widgetInstance.options.url = cleanWidgetUrl;
                }

                if (urlParams.has(self.options.orderParam)) {
                    $toolbar.find(self.selectors.orderControl).val(urlParams.get(self.options.orderParam));
                } else {
                    $toolbar.find(self.selectors.orderControl).prop('selectedIndex', 0);
                }

                const $finalLimiterSelect = $toolbar.find(self.selectors.limitControl);
                if ($finalLimiterSelect.length && urlParams.has(self.options.limitParam)) {
                    $finalLimiterSelect.val(urlParams.get(self.options.limitParam));
                }
            });
        },

        /**
         * Toggles visibility of toolbar structures based on navigation data and grid availability
         *
         * @param {jQuery} responseHtml
         */
        toggleToolbarVisibility: function (responseHtml) {
            const filters = navigationPool.filtersData() || [];
            const $newGridContainer = responseHtml.find(this.selectors.productGrid);
            const $toolbars = $(this.selectors.toolbar);

            // Check if every filter group in the pool contains zero selectable items
            const hasNoFilterItems = _.every(filters, function (filter) {
                return !filter.items || filter.items.length === 0;
            });

            if (hasNoFilterItems && !$newGridContainer.length) {
                $toolbars.hide();
            } else {
                $toolbars.show();
            }
        },

        /**
         * Reload swatch components to flush locked cached events data
         */
        reinitSwatches: function () {
            const $swatches = $(this.selectors.swatchOptions);
            if (!$swatches.length || !$.fn.SwatchRenderer) {
                return;
            }

            $swatches.each(function () {
                const $swatch = $(this);
                if ($swatch.data('mageSwatchRenderer')) {
                    $swatch.removeData('mageSwatchRenderer');
                }
                if ($swatch.attr('data-mage-init')) {
                    $swatch.trigger('contentUpdated');
                }
            });
        },
    });
});
