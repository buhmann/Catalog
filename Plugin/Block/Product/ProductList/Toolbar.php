<?php
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace Buhmann\Catalog\Plugin\Block\Product\ProductList;

use Buhmann\Catalog\Api\ViewModel\LayeredNavigationInterface as CatalogViewModel;
use Magento\Catalog\Block\Product\ProductList\Toolbar as Subject;
use Magento\Framework\Serialize\Serializer\Json;

class Toolbar
{
    private CatalogViewModel $viewModel;

    /**
     * @var Json
     */
    private Json $jsonSerializer;

    /**
     * @param CatalogViewModel $viewModel
     * @param Json $jsonSerializer
     */
    public function __construct(
        CatalogViewModel $viewModel,
        Json $jsonSerializer
    ) {
        $this->viewModel = $viewModel;
        $this->jsonSerializer = $jsonSerializer;
    }

    /**
     * Retrieve widget options in json format
     *
     * @param Subject $subject
     * @param string $result
     * @return string
     */
    public function afterGetWidgetOptionsJson(Subject $subject, string $result): string
    {
        try {
            $options = $this->jsonSerializer->unserialize($result);
        } catch (\InvalidArgumentException $e) {
            return $result;
        }

        if (isset($options['productListToolbarForm'])) {
            $options['productListToolbarForm']['ajaxNavigation'] = $this->viewModel->isAjaxNavEnabled();
        }

        return $this->jsonSerializer->serialize($options);
    }
}
