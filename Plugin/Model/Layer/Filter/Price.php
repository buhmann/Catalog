<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
declare(strict_types=1);

namespace Buhmann\Catalog\Plugin\Model\Layer\Filter;

use Exception;
use Magento\CatalogSearch\Model\Layer\Filter\Price as Subject;
use Magento\Framework\App\RequestInterface;
use Magento\Catalog\Model\Layer\Filter\DataProvider\PriceFactory;
use Magento\Catalog\Model\Layer\Filter\ItemFactory;
use Magento\Framework\Phrase;
use Magento\Framework\Pricing\PriceCurrencyInterface;
use Buhmann\Catalog\Api\ViewModel\LayeredNavigationInterface;

/**
 * Plugin for Price filter to support multi-select functionality
 */
class Price
{
    /**
     * @var LayeredNavigationInterface
     */
    private LayeredNavigationInterface $viewModel;

    /**
     * @var PriceFactory
     */
    private PriceFactory $dataProviderFactory;

    /**
     * @var ItemFactory
     */
    private ItemFactory $filterItemFactory;

    /**
     * @var PriceCurrencyInterface
     */
    private PriceCurrencyInterface $priceCurrency;

    /**
     * @param LayeredNavigationInterface $viewModel
     * @param PriceFactory $dataProviderFactory
     * @param ItemFactory $filterItemFactory
     * @param PriceCurrencyInterface $priceCurrency
     */
    public function __construct(
        LayeredNavigationInterface $viewModel,
        PriceFactory $dataProviderFactory,
        ItemFactory $filterItemFactory,
        PriceCurrencyInterface $priceCurrency
    ) {
        $this->viewModel = $viewModel;
        $this->dataProviderFactory = $dataProviderFactory;
        $this->filterItemFactory = $filterItemFactory;
        $this->priceCurrency = $priceCurrency;
    }

    /**
     * Apply price filter with multi-select support
     *
     * @param Subject $subject
     * @param callable $proceed
     * @param RequestInterface $request
     * @return Subject
     * @throws Exception
     */
    public function aroundApply(Subject $subject, callable $proceed, RequestInterface $request)
    {
        $filter = $request->getParam($subject->getRequestVar());

        // If multi-select is disabled or filter is not array - use original
        if (!$this->viewModel->isMultiSelectEnabled() || !is_array($filter)) {
            return $proceed($request);
        }

        $dataProvider = $this->dataProviderFactory->create(['layer' => $subject->getLayer()]);
        $collection = $subject->getLayer()->getProductCollection();

        // Remove existing price filter from state
        $this->removeFilterFromState($subject);

        // Build filter conditions for all selected price ranges
        $filterConditions = [];
        $selectedValues = [];
        $labels = [];
        $priorFilters = [];
        $interval = null;

        foreach ($filter as $range) {
            if (empty($range)) {
                continue;
            }

            $filterParams = explode(',', $range);
            $validFilter = $dataProvider->validateFilter($filterParams[0]);

            if ($validFilter) {
                list($from, $to) = $validFilter;

                // Store first interval for dataProvider
                if ($interval === null) {
                    $interval = [
                        $from,
                        empty($to) || $from == $to ? $to : $to - Subject::PRICE_DELTA
                    ];
                }

                // Add condition for this range
                $filterConditions[] = [
                    'from' => $from,
                    'to' => empty($to) || $from == $to ? $to : $to - Subject::PRICE_DELTA
                ];

                $selectedValues[] = $filterParams[0];
                $labels[] = $this->formatPriceLabel($from, $to);
                $priorFilters[] = $filterParams[0];
            }
        }

        // Set intervals in dataProvider for OpenSearch compatibility
        if (!empty($filterConditions) && $interval !== null) {
            $dataProvider->setInterval($interval);
            if (!empty($priorFilters)) {
                $dataProvider->setPriorIntervals($priorFilters);
            }
        }

        // Add filter items to state - one for each selected price range
        if (!empty($selectedValues)) {
            foreach ($selectedValues as $index => $value) {
                $item = $this->filterItemFactory->create()
                    ->setFilter($subject)
                    ->setLabel($labels[$index])
                    ->setValue($value)
                    ->setCount(0);

                $subject->getLayer()->getState()->addFilter($item);
            }
        }

        // Apply filter to collection
        if (!empty($filterConditions)) {
            // For OpenSearch, use addFieldToFilter with price field (same as original Magento)
            foreach ($filterConditions as $index => $condition) {
                if ($index === 0) {
                    $collection->addFieldToFilter('price', $condition);
                } else {
                    // Use addFieldToFilter for OR conditions
                    $collection->addFieldToFilter('price', $condition);
                }
            }
        }

        return $subject;
    }

    /**
     * Remove price filter from layer state
     *
     * @param Subject $subject
     * @return void
     * @throws Exception
     */
    private function removeFilterFromState(Subject $subject): void
    {
        $state = $subject->getLayer()->getState();
        $filters = $state->getFilters();

        foreach ($filters as $key => $filter) {
            $filterModel = $filter->getFilter();
            if ($filterModel && $filterModel->getRequestVar() === $subject->getRequestVar()) {
                unset($filters[$key]);
                break;
            }
        }

        $state->setFilters(array_values($filters));
    }

    /**
     * Format price label for display
     *
     * @param float|string $from
     * @param float|string $to
     * @return Phrase|string
     */
    private function formatPriceLabel(float|string $from, float|string $to): Phrase|string
    {
        $fromPrice = empty($from) ? 0 : $from;
        $toPrice = empty($to) ? $to : $to;

        $formattedFrom = $this->priceCurrency->format($fromPrice);

        if ($toPrice === '') {
            return __('%1 and above', $formattedFrom);
        }

        return __('%1 - %2', $formattedFrom, $this->priceCurrency->format($toPrice));
    }
}
