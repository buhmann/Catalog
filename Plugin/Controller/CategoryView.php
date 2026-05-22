<?php
namespace Buhmann\Catalog\Plugin\Controller;

use Buhmann\Catalog\ViewModel\LayeredNavigation;
use Magento\Catalog\Controller\Category\View as CategoryViewController;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\View\Result\Page;
use Magento\Framework\App\RequestInterface;
use Smile\ElasticsuiteCatalog\Block\Navigation as ElasticNavigationBlock;
use Magento\Swatches\Helper\Data as SwatchHelper;
use Magento\Catalog\Model\Layer\Filter\FilterInterface;
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
     * @var LayeredNavigation
     */
    private LayeredNavigation $layeredNavigationViewModel;

    /**
     * @param JsonFactory $jsonFactory
     * @param RequestInterface $request
     * @param SwatchHelper $swatchHelper
     * @param LayeredNavigation $layeredNavigationViewModel
     */
    public function __construct(
        JsonFactory $jsonFactory,
        RequestInterface $request,
        SwatchHelper $swatchHelper,
        LayeredNavigation $layeredNavigationViewModel
    ) {
        $this->jsonFactory = $jsonFactory;
        $this->request = $request;
        $this->swatchHelper = $swatchHelper;
        $this->layeredNavigationViewModel = $layeredNavigationViewModel;
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

        // 1. Collect standard HTML payloads from native blocks
        $productsBlock = $layout->getBlock('category.products.list');
        $productsHtml = $productsBlock ? $productsBlock->toHtml() : '';

        $toolbarBlock = $layout->getBlock('product_list_toolbar');
        $toolbarHtml = $toolbarBlock ? $toolbarBlock->toHtml() : '';

        $paginationBlock = $layout->getBlock('product_list_toolbar_pager');
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
     */
    private function extractFilterMetadata(FilterInterface $filter, $layout): array
    {
        $attributeModel = $filter->hasAttributeModel() ? $filter->getAttributeModel() : null;
        $requestVar = $filter->getRequestVar();

        $data = [
            'code'        => $requestVar,
            'label'       => __($filter->getName())->render(),
            'type'        => 'text',
            'sliderConfig'=> null,
            'items'       => []
        ];

        if ($filter instanceof Decimal ||
            $filter instanceof Price) {

            $data['type'] = 'slider';
            $blockClass = ($filter instanceof Price)
                ? PriceSlider::class
                : Slider::class;

            /** @var Slider $sliderBlock */
            $sliderBlock = $layout->createBlock($blockClass);

            if ($sliderBlock) {
                $sliderBlock->render($filter);

                $configMethod = new \ReflectionMethod(get_class($sliderBlock), 'getConfig');
                $configMethod->setAccessible(true);
                $sliderConfig = $configMethod->invoke($sliderBlock);

                $data['sliderConfig'] = $sliderConfig;
                return $data;
            }
        }

        $isSwatch = false;
        $swatchDataArray = [];
        if ($attributeModel && $this->swatchHelper->isSwatchAttribute($attributeModel)) {
            $isSwatch = true;
            $data['type'] = 'swatch';

            $optionIds = [];
            foreach ($filter->getItems() as $item) {
                $optionIds[] = $item->getValueString();
            }
            $swatchDataArray = $this->swatchHelper->getSwatchesByOptionsId($optionIds);
        }

        foreach ($filter->getItems() as $item) {
            $optionId = $item->getValueString();

            $itemData = [
                'label'       => (string)$item->getLabel(),
                'count'       => (int)$item->getCount(),
                'url'         => (string)$item->getUrl(),
                'is_selected' => (bool)$item->getIsSelected(),
                'value'       => $optionId,
                'swatch_value'=> null,
                'swatch_type' => null
            ];

            if ($isSwatch && isset($swatchDataArray[$optionId])) {
                $itemData['swatch_value'] = $swatchDataArray[$optionId]['value'];
                $itemData['swatch_type']  = $swatchDataArray[$optionId]['type'];
            }

            $data['items'][] = $itemData;
        }

        return $data;
    }
}
