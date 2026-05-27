define([
    'uiComponent',
    'ko',
    'underscore',
    'jquery',
    'mage/template',
    'Buhmann_Catalog/js/navigation-pool',
    'Magento_Catalog/js/price-utils',
    'jquery-ui-modules/slider'
], function (Component, ko, _, $, mageTemplate, navigationPool, priceUtil) {
    'use strict';

    /**
     * Knockout binding handler for Slider
     */
    ko.bindingHandlers.sliderRange = {
        init(element, valueAccessor) {
            const config = ko.utils.unwrapObservable(valueAccessor());
            const min = ko.utils.unwrapObservable(config.min);
            const max = ko.utils.unwrapObservable(config.max);
            const step = ko.utils.unwrapObservable(config.step);
            const values = ko.utils.unwrapObservable(config.values);

            if (min === undefined || max === undefined || values?.[0] === undefined || values?.[1] === undefined) {
                return;
            }

            $(element).slider({
                range: true,
                min: Number(min),
                max: Number(max),
                step: step !== undefined ? Number(step) : 1,
                values: [Number(values[0]), Number(values[1])],
                slide: (event, ui) => {
                    if (typeof config.slide === 'function') {
                        config.slide(event, ui);
                    }
                },
                stop: (event, ui) => {
                    if (typeof config.stop === 'function') {
                        config.stop(event, ui);
                    }
                }
            });

            ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
                if ($(element).data('ui-slider')) {
                    $(element).slider('destroy');
                }
            });
        },

        update(element, valueAccessor) {
            const config = ko.utils.unwrapObservable(valueAccessor());
            const min = ko.utils.unwrapObservable(config.min);
            const max = ko.utils.unwrapObservable(config.max);
            const step = ko.utils.unwrapObservable(config.step);
            const values = ko.utils.unwrapObservable(config.values);
            const $slider = $(element);

            if (min === undefined || max === undefined || values?.[0] === undefined || values?.[1] === undefined) {
                return;
            }

            if (!$slider.data('ui-slider')) {
                $slider.slider({
                    range: true,
                    min: Number(min),
                    max: Number(max),
                    step: step !== undefined ? Number(step) : 1,
                    values: [Number(values[0]), Number(values[1])],
                    slide: (event, ui) => {
                        if (typeof config.slide === 'function') {
                            config.slide(event, ui);
                        }
                    },
                    stop: (event, ui) => {
                        if (typeof config.stop === 'function') {
                            config.stop(event, ui);
                        }
                    }
                });
                return;
            }

            $slider.slider('option', 'min', Number(min));
            $slider.slider('option', 'max', Number(max));
            if (step !== undefined) {
                $slider.slider('option', 'step', Number(step));
            }
            $slider.slider('values', [Number(values[0]), Number(values[1])]);
        }
    };

    return Component.extend({
        defaults: {
            filterCode: 'price',
            isInstantAjax: true,
            fieldFormat: null,
            template: 'Buhmann_Catalog/layer/filter/slider',
            messageTemplates: {
                displayOne: '<span class="msg">1 item</span>',
                displayCount: '<span class="msg"><%- count %> items</span>',
                displayEmpty: '<span class="msg-error">No items in the current range.</span>'
            }
        },

        /**
         * Component initialization
         */
        initObservable() {
            this._super();

            this.observe([
                'isInstantAjax',
                'minValue',
                'maxValue',
                'stepValue',
                'currentFrom',
                'currentTo',
                'displayFrom',
                'displayTo',
                'messageBoxHtml',
                'hasItems'
            ]);

            this.hasItems(false);
            this.urlTemplate = '';
            this.intervals = [];
            this.rate = 1.0000;
            this.showAdaptiveSlider = false;

            // Global catalog scale records
            this.absoluteMin = null;
            this.absoluteMax = null;
            this._isUpdatingFromPool = false;

            // Initial stream sync & tracking subscription
            this.updateSliderFromPool(navigationPool.filtersData());
            navigationPool.filtersData.subscribe((allFilters) => {
                this.updateSliderFromPool(allFilters);
            });

            return this;
        },

        /**
         * Resolve element visual semantic identifiers
         */
        getDataRole() {
            return this.filterCode === 'price'
                ? `range-price-slider-${this.filterCode}`
                : `range-slider-${this.filterCode}`;
        },

        /**
         * Safely parse repository stream payloads and recalculate non-shrinking boundaries
         * @param {Array} allFilters
         */
        updateSliderFromPool(allFilters) {
            if (!allFilters || !Array.isArray(allFilters)) {
                return;
            }

            const matchedFilter = allFilters.find(filter => filter.code === this.filterCode);

            if (!matchedFilter || !matchedFilter.sliderConfig) {
                this.hasItems(false);
                return;
            }

            const config = matchedFilter.sliderConfig;

            this.urlTemplate = config.urlTemplate || '';
            this.intervals = config.intervals || [];
            this.rate = parseFloat(config.rate) || 1.0000;
            this.showAdaptiveSlider = !!config.showAdaptiveSlider;
            this.fieldFormat = config.fieldFormat || null;

            if (config.messageTemplates) {
                this.messageTemplates = { ...this.messageTemplates, ...config.messageTemplates };
            }

            const incomingMin = config.minValue !== undefined ? Number(config.minValue) : 0;
            const incomingMax = config.maxValue !== undefined ? Number(config.maxValue) : 100;

            // Enforce historic outermost range constraints to block structural jumping glitches
            if (this.absoluteMin === null || incomingMin < this.absoluteMin) {
                this.absoluteMin = incomingMin;
            }
            if (this.absoluteMax === null || incomingMax > this.absoluteMax) {
                this.absoluteMax = incomingMax;
            }

            this._isUpdatingFromPool = true;

            this.minValue(this.absoluteMin);
            this.maxValue(this.absoluteMax);
            this.stepValue(config.step !== undefined ? Number(config.step) : 1);

            const rawFrom = config.currentValue?.from !== undefined ? config.currentValue.from : config.from;
            const rawTo = config.currentValue?.to !== undefined ? config.currentValue.to : config.to;

            let finalFrom = rawFrom !== undefined ? Number(rawFrom) : this.minValue();
            let finalTo = rawTo !== undefined ? Number(rawTo) : this.maxValue();

            if (finalFrom < this.minValue()) finalFrom = this.minValue();
            if (finalTo > this.maxValue()) finalTo = this.maxValue();

            this.currentFrom(finalFrom);
            this.currentTo(finalTo);

            this._refreshDisplayStates(this.currentFrom(), this.currentTo());
            this.hasItems(true);

            this._isUpdatingFromPool = false;
        },

        /**
         * Handle slider slide event
         */
        handleSliderSlide(event, ui) {
            const fromValue = this._getClosestAdaptiveValue(ui.values[0]);
            const toValue = this._getClosestAdaptiveValue(ui.values[1]);
            this._refreshDisplayStates(fromValue, toValue);
        },

        /**
         * Handle slider stop event
         */
        handleSliderStop(event, ui) {
            if (this._isUpdatingFromPool) {
                return;
            }

            this.currentFrom(this._getClosestAdaptiveValue(ui.values[0]));
            this.currentTo(this._getClosestAdaptiveValue(ui.values[1]));

            if (this.isInstantAjax()) {
                this._dispatchNavigation();
            }
        },

        /**
         * Handle apply button click event
         */
        handleApplyClick(data, event) {
            if (event) {
                event.preventDefault();
            }
            this._dispatchNavigation();
        },

        /**
         * Trigger route stream processing redirects
         */
        _dispatchNavigation() {
            const targetUrl = this._generateFilterUrl();
            if (targetUrl) {
                navigationPool.navigate(targetUrl);
            }
        },

        /**
         * Assemble filter template payload redirect targets
         */
        _generateFilterUrl() {
            if (!this.urlTemplate) {
                return null;
            }

            const rangePayload = {
                from: this._getOriginalValue(this.currentFrom()) * (1 / this.rate),
                to: this._getOriginalValue(this.currentTo()) * (1 / this.rate)
            };

            return mageTemplate(this.urlTemplate)(rangePayload);
        },

        /**
         * Identify closest adaptive intervals matches definitions
         */
        _getClosestAdaptiveValue(value) {
            if (!this.showAdaptiveSlider || !this.intervals.length) {
                return value;
            }

            let closestValue = value;
            let found = false;

            this.intervals.forEach(item => {
                if (item.value === value) {
                    closestValue = value;
                    found = true;
                }
                if (!found && item.value < value) {
                    closestValue = item.value;
                }
            });

            return closestValue;
        },

        /**
         * Resolve localized unscaled data values references
         */
        _getOriginalValue(value) {
            if (!this.showAdaptiveSlider || !this.intervals.length) {
                return value;
            }

            const matched = this.intervals.find(item => item.value === value);
            return matched ? matched.originalValue : value;
        },

        /**
         * Sum items inside dynamic range windows payload matrices
         */
        _getItemCount(from, to) {
            if (!this.intervals?.length) {
                return 0;
            }

            return this.intervals
                .map(item => {
                    const isIncluded = item.value >= from && (item.value < to || (from === to && item.value <= to));
                    return isIncluded ? parseInt(item.count, 10) : 0;
                })
                .reduce((a, b) => a + b, 0);
        },

        /**
         * Rerender templates labels states
         */
        _refreshDisplayStates(from, to) {
            const originalFrom = this._getOriginalValue(from);
            const originalTo = this._getOriginalValue(to);

            if (this.fieldFormat) {
                this.displayFrom(priceUtil.formatPrice(originalFrom, this.fieldFormat));
                this.displayTo(priceUtil.formatPrice(originalTo, this.fieldFormat));
            } else {
                this.displayFrom(originalFrom);
                this.displayTo(originalTo);
            }

            const count = this._getItemCount(from, to);
            let templateString = this.messageTemplates.displayEmpty;

            if (count === 1) {
                templateString = this.messageTemplates.displayOne;
            } else if (count > 1) {
                templateString = this.messageTemplates.displayCount;
            }

            this.messageBoxHtml(mageTemplate(templateString)({ count }));
        }
    });
});
