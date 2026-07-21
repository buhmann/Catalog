<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
declare(strict_types=1);

namespace Buhmann\Catalog\Plugin\Controller;

use Buhmann\Catalog\Api\ViewModel\LayeredNavigationInterface as CatalogViewModel;
use Exception;
use Magento\Catalog\Block\Product\ListProduct;
use Magento\Catalog\Block\Product\ProductList\Toolbar;
use Magento\Catalog\Controller\Category\View as CategoryViewController;
use Magento\Catalog\Model\Layer\Filter\AbstractFilter;
use Magento\Catalog\Model\Layer\Filter\FilterInterface;
use Magento\Catalog\Model\ResourceModel\Product\CollectionFactory as ProductCollectionFactory;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Pricing\PriceCurrencyInterface;
use Magento\Framework\UrlInterface;
use Magento\Framework\View\LayoutInterface;
use Magento\Framework\View\Result\Page;
use Magento\Framework\App\RequestInterface;
use Magento\LayeredNavigation\Block\Navigation as NavigationBlock;
use Magento\Swatches\Helper\Data as SwatchHelper;
use Magento\Swatches\Helper\Media as SwatchMediaHelper;
use Magento\Theme\Block\Html\Pager;

class CategoryView
{
    /**
     * @var JsonFactory
     */
    private JsonFactory $jsonFactory;

    /**
     * @var RequestInterface
     */
    private RequestInterface $request;

    /**
     * @var SwatchHelper
     */
    private SwatchHelper $swatchHelper;

    /**
     * @var SwatchMediaHelper
     */
    private SwatchMediaHelper $swatchMediaHelper;

    /**
     * @var CatalogViewModel
     */
    private CatalogViewModel $layeredNavigationViewModel;

    /**
     * @var ProductCollectionFactory
     */
    private ProductCollectionFactory $productCollectionFactory;

    /**
     * @var PriceCurrencyInterface
     */
    private PriceCurrencyInterface $priceCurrency;

    /**
     * @var UrlInterface
     */
    protected UrlInterface $_url;

    /**
     * @param JsonFactory $jsonFactory
     * @param RequestInterface $request
     * @param SwatchHelper $swatchHelper
     * @param SwatchMediaHelper $swatchMediaHelper
     * @param CatalogViewModel $layeredNavigationViewModel
     * @param ProductCollectionFactory $productCollectionFactory
     * @param PriceCurrencyInterface $priceCurrency
     * @param UrlInterface $url
     */
    public function __construct(
        JsonFactory $jsonFactory,
        RequestInterface $request,
        SwatchHelper $swatchHelper,
        SwatchMediaHelper $swatchMediaHelper,
        CatalogViewModel $layeredNavigationViewModel,
        ProductCollectionFactory $productCollectionFactory,
        PriceCurrencyInterface $priceCurrency,
        UrlInterface $url
    ) {
        $this->jsonFactory = $jsonFactory;
        $this->request = $request;
        $this->swatchHelper = $swatchHelper;
        $this->swatchMediaHelper = $swatchMediaHelper;
        $this->layeredNavigationViewModel = $layeredNavigationViewModel;
        $this->productCollectionFactory = $productCollectionFactory;
        $this->priceCurrency = $priceCurrency;
        $this->_url = $url;
    }

    /**
     * Plugin for category view controller to handle AJAX navigation
     * Returns JSON response with products, filters, and active filters data
     *
     * @param CategoryViewController $subject
     * @param mixed $result
     * @return mixed
     * @throws LocalizedException
     */
    public function afterExecute(CategoryViewController $subject, $result)
    {
        if (!($result instanceof Page)) {
            return $result;
        }

        if ($this->layeredNavigationViewModel->isInfiniteScroll()) {
            $result->getConfig()->addBodyClass('products-infinite-scroll');
        }
        if ($this->layeredNavigationViewModel->isAjaxNavEnabled()) {
            $result->getConfig()->addBodyClass('ajax-layered-navigation');
        }

        if (!$this->request->getParam('isAjax')) {
            return $result;
        }

        $layout = $result->getLayout();

        /** @var ListProduct $productsBlock */
        $productsBlock = $layout->getBlock('category.products.list');
        /** @var Toolbar $toolbarBlock */
        $toolbarBlock = $layout->getBlock('product_list_toolbar');
        /** @var Pager $paginationBlock */
        $paginationBlock = $layout->getBlock('product_list_toolbar_pager');

        $emptyProductCollection = null;
        if ($toolbarBlock && (!$toolbarBlock->getCollection() || $toolbarBlock->getCollection() === null)) {
            $emptyProductCollection = $this->productCollectionFactory->create();
            $toolbarBlock->setCollection($emptyProductCollection);
        }
        if ($paginationBlock && (!$paginationBlock->getCollection() || $paginationBlock->getCollection() === null)) {
            if (!$emptyProductCollection) {
                $emptyProductCollection = $this->productCollectionFactory->create();
            }
            $paginationBlock->setCollection($emptyProductCollection);
        }

        $productsHtml = $productsBlock ? $productsBlock->toHtml() : '';
        $toolbarHtml = $toolbarBlock ? $toolbarBlock->toHtml() : '';
        $paginationHtml = $paginationBlock ? $paginationBlock->toHtml() : '';

        $productsHtml = $this->cleanAjaxParams($productsHtml);
        $toolbarHtml = $this->cleanAjaxParams($toolbarHtml);
        $paginationHtml = $this->cleanAjaxParams($paginationHtml);

        $filtersData = [];
        $activeFiltersData = [];

        /** @var NavigationBlock $navigationBlock */
        $navigationBlock = $layout->getBlock('catalog.leftnav');

        if ($navigationBlock && $navigationBlock->canShowBlock()) {
            foreach ($navigationBlock->getFilters() as $filter) {
                /** @var AbstractFilter $filter */
                if (!$filter->getItemsCount()) {
                    continue;
                }

                $filterData = $this->extractFilterMetadata($filter, $layout);
                if (!empty($filterData)) {
                    $filtersData[] = $filterData;
                }
            }

            $activeFiltersData = $this->getActiveFilters($navigationBlock->getFilters());
        }

        $jsonResult = $this->jsonFactory->create();
        $jsonResult->setData([
            'success'        => true,
            'products'       => $productsHtml,
            'toolbar'        => $toolbarHtml,
            'pagination'     => $paginationHtml,
            'filters'        => $filtersData,
            'activeFilters'  => $activeFiltersData,
        ]);

        return $jsonResult;
    }

    /**
     * Extract filter metadata including items and swatch data
     * Handles both regular text filters and swatch attributes
     *
     * @param FilterInterface $filter
     * @param LayoutInterface $layout
     * @return array Filter data with items, labels, URLs, and swatch information
     * @throws LocalizedException
     */
    public function extractFilterMetadata(FilterInterface $filter, LayoutInterface $layout): array
    {
        $attributeModel = $filter->hasAttributeModel() ? $filter->getAttributeModel() : null;
        $requestVar = $filter->getRequestVar();

        $data = [
            'code'                => $requestVar,
            'label'               => __($filter->getName())->render(),
            'type'                => $filter->getFrontendType() ?? 'text',
            'maxSize'             => $this->layeredNavigationViewModel->getMaxFilterItems(),
            'hasMoreItems'        => count($filter->getItems()) > $this->layeredNavigationViewModel->getMaxFilterItems(),
            'displayProductCount' => (int)$this->layeredNavigationViewModel->displayProductCount(),
            'isMultiSelect'       => $this->layeredNavigationViewModel->isMultiSelectEnabled(),
            'items'               => [],
        ];

        $isSwatch = false;
        $swatchDataArray = [];
        $textToIdMap = [];

        // Check if this is a swatch attribute
        if ($attributeModel && $this->swatchHelper->isSwatchAttribute($attributeModel)) {
            $isSwatch = true;
            $data['type'] = 'swatch';

            // Map option labels to their numeric option IDs
            foreach ($attributeModel->getOptions() as $option) {
                $label = $option->getLabel();
                $id = $option->getValue();
                if ($label !== null && $id !== null) {
                    $textToIdMap[strtolower(trim($label))] = (int)$id;
                }
            }

            // Collect valid numeric option IDs present in the current filter items
            $numericOptionIds = [];
            foreach ($filter->getItems() as $item) {
                $itemValueKey = strtolower(trim((string)$item->getValueString()));
                if (isset($textToIdMap[$itemValueKey])) {
                    $numericOptionIds[] = $textToIdMap[$itemValueKey];
                }
            }

            if (!empty($numericOptionIds)) {
                $swatchDataArray = $this->swatchHelper->getSwatchesByOptionsId($numericOptionIds);
            }
        }

        // Build final items collection
        foreach ($filter->getItems() as $item) {
            $optionValueString = (string)$item->getValueString();
            $itemValueKey = strtolower(trim($optionValueString));

            $itemData = [
                'label'       => (string)$item->getLabel(),
                'count'       => (int)$item->getCount(),
                'url'         => html_entity_decode($item->getData('url') ?? $item->getUrl()),
                'is_selected' => (bool)$item->getIsSelected(),
                'value'       => $optionValueString,
                'swatch_value'=> null,
                'swatch_type' => null
            ];

            // Handle swatch attributes
            if ($isSwatch && isset($textToIdMap[$itemValueKey])) {
                $numericId = $textToIdMap[$itemValueKey];
                $swatchItem = $swatchDataArray[$numericId] ?? null;

                if (is_array($swatchItem)) {
                    $rawType = isset($swatchItem['type']) ? str_replace(['"', "'"], '', (string)$swatchItem['type']) : '0';
                    $rawValue = isset($swatchItem['value']) ? str_replace(['"', "'"], '', (string)$swatchItem['value']) : '';

                    $cleanType = trim($rawType);
                    $cleanValue = trim($rawValue);

                    $itemData['swatch_type'] = (int)$cleanType;

                    if ($itemData['swatch_type'] === 2 && $cleanValue !== '') {
                        $itemData['swatch_value'] = $this->swatchMediaHelper->getSwatchAttributeImage($cleanType, $cleanValue);
                    } else {
                        $itemData['swatch_value'] = $cleanValue !== '' ? $cleanValue : null;
                    }
                }
            }

            $data['items'][] = $itemData;
        }

        return $data;
    }

    /**
     * Get active filters from request parameters
     * Returns array of active filter items with individual remove URLs
     * Each filter value is separated to allow individual removal
     *
     * @param array $filters
     * @return array
     */
    private function getActiveFilters(array $filters): array
    {
        $activeFiltersData = [];
        $requestParams = $this->request->getParams();

        foreach ($filters as $filter) {
            $requestVar = $filter->getRequestVar();

            // Check if this filter has active values in request
            if (!isset($requestParams[$requestVar])) {
                continue;
            }

            $values = $requestParams[$requestVar];
            if (!is_array($values)) {
                $values = explode(',', (string)$values);
            }

            // Get filter label
            $filterLabel = $filter->getName();
            if (empty($filterLabel)) {
                $filterLabel = $requestVar;
            }

            // Create separate filter item for each value to allow individual removal
            foreach ($values as $value) {
                $valueLabel = $this->getOptionLabel($filter, $value);
                $removeUrl = $this->buildRemoveUrl($requestVar, $value);

                $activeFiltersData[] = [
                    'filterLabel' => $filterLabel,
                    'valueLabel'  => $valueLabel,
                    'clearUrl'    => html_entity_decode($removeUrl),
                ];
            }
        }

        return $activeFiltersData;
    }

    /**
     * Build URL to remove specific filter value
     * Creates proper URL with current category path and filter parameters
     * Uses _current => false to prevent Magento from adding current request params
     * which would cause duplicate parameters when removing the last filter value
     *
     * @param string $requestVar Filter request variable name (e.g., 'climate', 'price')
     * @param mixed $value Filter value to remove
     * @return string Full URL for removing the specific filter value
     */
    private function buildRemoveUrl(string $requestVar, $value): string
    {
        $params = $this->request->getParams();

        // Remove the specific value from filter parameters
        if (isset($params[$requestVar])) {
            $currentValues = is_array($params[$requestVar])
                ? $params[$requestVar]
                : explode(',', (string)$params[$requestVar]);

            $remainingValues = array_filter($currentValues, function($item) use ($value) {
                return (string)$item !== (string)$value;
            });

            // If there are remaining values, keep them; otherwise remove the entire filter parameter
            if (!empty($remainingValues)) {
                $params[$requestVar] = array_values($remainingValues);
            } else {
                unset($params[$requestVar]);
            }
        }

        // Clean up AJAX-specific parameters that should not be in the final URL
        unset($params['isAjax']);
        unset($params['_']);
        unset($params['id']);

        // Build URL with proper parameters
        $urlParams = [
            '_current' => false,
            '_use_rewrite' => true,
            '_query' => $params
        ];

        return $this->cleanAjaxParams($this->_url->getUrl('*/*/*', $urlParams));
    }

    /**
     * Get human-readable label for filter option value
     * Handles special cases for price, category, and attribute filters
     *
     * @param FilterInterface $filter
     * @param mixed $value Filter value ID
     * @return string Human-readable label
     */
    private function getOptionLabel(FilterInterface $filter, $value): string
    {
        $requestVar = $filter->getRequestVar();

        // For price filter - format with currency symbol from current store
        if ($requestVar === 'price') {
            return $this->formatPriceLabel((string)$value);
        }

        // For category filter
        if ($requestVar === 'cat') {
            try {
                $category = $filter->getLayer()->getCurrentCategory();
                return $category->getName();
            } catch (Exception) {
                return (string)$value;
            }
        }

        // For attribute filters - get option text from attribute model
        try {
            $attributeModel = $filter->getAttributeModel();
            if ($attributeModel) {
                $optionText = $attributeModel->getFrontend()->getOption($value);
                if ($optionText) {
                    return (string)$optionText;
                }
            }
        } catch (Exception) {
            // Fallback to value
        }

        return (string)$value;
    }

    /**
     * Format price filter label with currency symbol from current store
     * Converts "20-30" to "$20.00 - $30.00" format
     *
     * @param string $value Price range value (e.g., "20-30")
     * @return string Formatted price label with currency
     */
    private function formatPriceLabel(string $value): string
    {
        $parts = preg_split('/[-,]/', $value);
        $formattedParts = [];

        foreach ($parts as $part) {
            $price = (float)trim($part);
            if ($price > 0) {
                $formattedParts[] = $this->priceCurrency->format($price, false);
            }
        }

        if (count($formattedParts) === 2) {
            return $formattedParts[0] . ' - ' . $formattedParts[1];
        } elseif (count($formattedParts) === 1) {
            return $formattedParts[0];
        }

        return $value;
    }

    /**
     * Remove AJAX-specific parameters from URLs in HTML content
     * Cleans up isAjax parameters that should not be present in final URLs
     *
     * @param string $html HTML content with URLs
     * @return string Cleaned HTML content
     */
    private function cleanAjaxParams(string $html): string
    {
        $patterns = [
            '/\?isAjax=1&amp;/',
            '/\?isAjax=1&/',
            '/&amp;isAjax=1/',
            '/&isAjax=1/'
        ];

        return preg_replace($patterns, '', $html) ?? $html;
    }
}
