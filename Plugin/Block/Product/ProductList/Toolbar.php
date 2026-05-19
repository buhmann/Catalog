<?php
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace Buhmann\Catalog\Plugin\Block\Product\ProductList;

use Buhmann\Catalog\ViewModel\LayeredNavigation;
use Magento\Framework\Serialize\Serializer\Json;

class Toolbar
{
    private LayeredNavigation $viewModel;

    /**
     * @var Json
     */
    private Json $jsonSerializer;

    /**
     * @param LayeredNavigation $viewModel
     * @param Json $jsonSerializer
     */
    public function __construct(
        LayeredNavigation $viewModel,
        Json $jsonSerializer
    ) {
        $this->viewModel = $viewModel;
        $this->jsonSerializer = $jsonSerializer;
    }

    /**
     * Retrieve widget options in json format
     *
     * @param \Magento\Catalog\Block\Product\ProductList\Toolbar $subject
     * @param string $result
     * @return string
     */
    public function afterGetWidgetOptionsJson(\Magento\Catalog\Block\Product\ProductList\Toolbar $subject, string $result): string
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
