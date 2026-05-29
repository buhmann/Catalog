<?php

namespace Buhmann\Catalog\Plugin\Controller;

use Buhmann\Catalog\ViewModel\LayeredNavigation;
use Magento\Catalog\Controller\Category\View as CategoryViewController;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\View\LayoutInterface;
use Magento\Framework\View\Result\Page;
use Magento\Framework\App\RequestInterface;
use Magento\Store\Model\StoreManagerInterface;
use ReflectionMethod;
use Smile\ElasticsuiteCatalog\Block\Navigation as ElasticNavigationBlock;
use Magento\Swatches\Helper\Data as SwatchHelper;
use Magento\Swatches\Helper\Media as SwatchMediaHelper;
use Magento\Catalog\Model\Layer\Filter\FilterInterface;
use Smile\ElasticsuiteCatalog\Block\Navigation\Renderer\PriceSlider;
use Smile\ElasticsuiteCatalog\Block\Navigation\Renderer\Slider;
use Smile\ElasticsuiteCatalog\Model\Layer\Filter\Decimal;
use Smile\ElasticsuiteCatalog\Model\Layer\Filter\Price;
use Magento\Catalog\Model\ResourceModel\Product\CollectionFactory as ProductCollectionFactory;

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
     * @var LayeredNavigation
     */
    private LayeredNavigation $layeredNavigationViewModel;

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
     * @param LayeredNavigation $layeredNavigationViewModel
     * @param ProductCollectionFactory $productCollectionFactory
     * @param StoreManagerInterface $storeManager
     */
    public function __construct(
        JsonFactory $jsonFactory,
        RequestInterface $request,
        SwatchHelper $swatchHelper,
        SwatchMediaHelper $swatchMediaHelper,
        LayeredNavigation $layeredNavigationViewModel,
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
     * @param CategoryViewController $subject
     * @param mixed $result
     * @return mixed
     */
    public function afterExecute(CategoryViewController $subject, $result)
    {
        if ($result instanceof Page) {
            if ($this->layeredNavigationViewModel->isInfiniteScroll()) {
                $result->getConfig()->addBodyClass('products-infinite-scroll');
            }
            if ($this->layeredNavigationViewModel->isAjaxNavEnabled()) {
                $result->getConfig()->addBodyClass('ajax-layered-navigation');
            }
        }

        return $result;
    }

    /**
     * Intercept execution to build data payload for the AJAX pool
     */
    public function aroundExecute(CategoryViewController $subject, callable $proceed)
    {
        $pageResult = $proceed();

        if (!($pageResult instanceof Page) || !$this->request->getParam('isAjax')) {
            return $pageResult;
        }

        $layout = $pageResult->getLayout();

        $productsBlock = $layout->getBlock('category.products.list');
        $toolbarBlock = $layout->getBlock('product_list_toolbar');
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

        // 1. Collect standard HTML payloads from native blocks
        $productsHtml = $productsBlock ? $productsBlock->toHtml() : '';
        $toolbarHtml = $toolbarBlock ? $toolbarBlock->toHtml() : '';
        $paginationHtml = $paginationBlock ? $paginationBlock->toHtml() : '';

        // HARD FIX: Clean up any traces of internal isAjax parameters inside the generated HTML chunks
        $productsHtml = str_replace(['?isAjax=1&amp;', '?isAjax=1&', '&amp;isAjax=1', '&isAjax=1'], '', $productsHtml);
        $toolbarHtml = str_replace(['?isAjax=1&amp;', '?isAjax=1&', '&amp;isAjax=1', '&isAjax=1'], '', $toolbarHtml);
        $paginationHtml = str_replace(['?isAjax=1&amp;', '?isAjax=1&', '&amp;isAjax=1', '&isAjax=1'], '', $paginationHtml);

        // 2. Extract structured filters JSON configuration for ElasticSuite
        $filtersData = [];
        /** @var ElasticNavigationBlock $navigationBlock */
        $navigationBlock = $layout->getBlock('catalog.leftnav');

        if ($navigationBlock && $navigationBlock->canShowBlock()) {
            foreach ($navigationBlock->getFilters() as $filter) {
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
            'filters'    => $filtersData
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
            'items'               => []
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

        if ($attributeModel && $this->swatchHelper->isSwatchAttribute($attributeModel)) {
            $isSwatch = true;
            $data['type'] = 'swatch';

            // Map lowercase option labels to their numeric option IDs
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
                $itemValueKey = strtolower(trim($item->getValueString()));
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
            $optionValueString = $item->getValueString();
            $itemValueKey = strtolower(trim($optionValueString));

            $itemData = [
                'label'       => (string)$item->getLabel(),
                'count'       => (int)$item->getCount(),
                'url'         => (string)$item->getUrl(),
                'is_selected' => (bool)$item->getIsSelected(),
                'value'       => $optionValueString,
                'swatch_value'=> null,
                'swatch_type' => null
            ];

            // Guard clause: skip processing if it's not a swatch or option mapping doesn't exist
            if (!$isSwatch || !isset($textToIdMap[$itemValueKey])) {
                $data['items'][] = $itemData;
                continue;
            }

            $numericId = $textToIdMap[$itemValueKey];
            $swatchItem = $swatchDataArray[$numericId] ?? null;

            if (is_array($swatchItem)) {
                // Securely extract and sanitize raw string inputs with early fallback values
                $rawType = isset($swatchItem['type']) ? str_replace(['"', "'"], '', $swatchItem['type']) : '0';
                $rawValue = isset($swatchItem['value']) ? str_replace(['"', "'"], '', $swatchItem['value']) : '';

                $cleanType = trim($rawType);
                $cleanValue = trim($rawValue);

                $itemData['swatch_type'] = (int)$cleanType;

                // Resolve values based on strict type match (Type 2 is an image swatch)
                if ($itemData['swatch_type'] === 2 && $cleanValue !== '') {
                    $itemData['swatch_value'] = $this->swatchMediaHelper->getSwatchAttributeImage($cleanType, $cleanValue);
                } else {
                    $itemData['swatch_value'] = $cleanValue !== '' ? $cleanValue : null;
                }
            }

            $data['items'][] = $itemData;
        }

        return $data;
    }
}
