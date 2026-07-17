<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
declare(strict_types=1);

namespace Buhmann\Catalog\Plugin\Controller;

use Buhmann\Catalog\Api\ViewModel\LayeredNavigationInterface as CatalogViewModel;
use Magento\Catalog\Block\Product\ListProduct;
use Magento\Catalog\Block\Product\ProductList\Toolbar;
use Magento\Catalog\Controller\Category\View as CategoryViewController;
use Magento\Catalog\Model\Layer\Filter\AbstractFilter;
use Magento\Catalog\Model\Layer\Filter\FilterInterface;
use Magento\Catalog\Model\ResourceModel\Product\CollectionFactory as ProductCollectionFactory;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\View\LayoutInterface;
use Magento\Framework\View\Result\Page;
use Magento\Framework\App\RequestInterface;
use Magento\LayeredNavigation\Block\Navigation as NavigationBlock;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Swatches\Helper\Data as SwatchHelper;
use Magento\Swatches\Helper\Media as SwatchMediaHelper;
use Magento\Theme\Block\Html\Pager;
use ReflectionMethod;
use Smile\ElasticsuiteCatalog\Block\Navigation\Renderer\PriceSlider;
use Smile\ElasticsuiteCatalog\Block\Navigation\Renderer\Slider;
use Smile\ElasticsuiteCatalog\Model\Layer\Filter\Decimal;
use Smile\ElasticsuiteCatalog\Model\Layer\Filter\Price;

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
     * @var StoreManagerInterface
     */
    private StoreManagerInterface $storeManager;

    /**
     * @param JsonFactory $jsonFactory
     * @param RequestInterface $request
     * @param SwatchHelper $swatchHelper
     * @param SwatchMediaHelper $swatchMediaHelper
     * @param CatalogViewModel $layeredNavigationViewModel
     * @param ProductCollectionFactory $productCollectionFactory
     * @param StoreManagerInterface $storeManager
     */
    public function __construct(
        JsonFactory $jsonFactory,
        RequestInterface $request,
        SwatchHelper $swatchHelper,
        SwatchMediaHelper $swatchMediaHelper,
        CatalogViewModel $layeredNavigationViewModel,
        ProductCollectionFactory $productCollectionFactory,
        StoreManagerInterface $storeManager
    ) {
        $this->jsonFactory = $jsonFactory;
        $this->request = $request;
        $this->swatchHelper = $swatchHelper;
        $this->swatchMediaHelper = $swatchMediaHelper;
        $this->layeredNavigationViewModel = $layeredNavigationViewModel;
        $this->productCollectionFactory = $productCollectionFactory;
        $this->storeManager = $storeManager;
    }

    /**
     * Add body classes for infinite scroll and AJAX navigation
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
        }

        $jsonResult = $this->jsonFactory->create();
        $jsonResult->setData([
            'success'    => true,
            'products'   => $productsHtml,
            'toolbar'    => $toolbarHtml,
            'pagination' => $paginationHtml,
            'filters'    => $filtersData,
        ]);

        return $jsonResult;
    }

    /**
     * Parse single filter model data depending on its type (Text, Swatch, Slider)
     *
     * @param FilterInterface $filter
     * @param LayoutInterface $layout
     * @return array
     * @throws \ReflectionException|LocalizedException
     */
    private function extractFilterMetadata(FilterInterface $filter, LayoutInterface $layout): array
    {
        $attributeModel = $filter->hasAttributeModel() ? $filter->getAttributeModel() : null;
        $requestVar = $filter->getRequestVar();

        $data = [
            'code'                => $requestVar,
            'label'               => __($filter->getName())->render(),
            'type'                => 'text',
            'sliderConfig'        => null,
            'maxSize'             => $this->layeredNavigationViewModel->getMaxFilterItems(),
            'hasMoreItems'        => count($filter->getItems()) > $this->layeredNavigationViewModel->getMaxFilterItems(),
            'displayProductCount' => (int)$this->layeredNavigationViewModel->displayProductCount(),
            'items'               => [],
        ];

        if ($filter instanceof Decimal || $filter instanceof Price) {
            $data['type'] = 'slider';
            $blockClass = ($filter instanceof Price) ? PriceSlider::class : Slider::class;

            /** @var Slider $sliderBlock */
            $sliderBlock = $layout->createBlock($blockClass);

            if ($sliderBlock) {
                $sliderBlock->render($filter);

                $configMethod = new ReflectionMethod(get_class($sliderBlock), 'getConfig');
                $configMethod->setAccessible(true);
                $data['sliderConfig'] = $configMethod->invoke($sliderBlock);

                if ($filter instanceof Price) {
                    $data['sliderConfig']['currencySymbol'] = $this->storeManager->getStore()->getCurrentCurrency()->getCurrencySymbol();
                }

                return $data;
            }
        }

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

            // Collect only valid numeric option IDs present in the current filter items
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

        // 3. Build final items collection with structural optimization
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
     * Clean up isAjax parameters from URLs in HTML
     *
     * @param string $html
     * @return string
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
