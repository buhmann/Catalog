<?php
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace Buhmann\Catalog\ViewModel;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Store\Model\ScopeInterface;

class LayeredNavigation implements ArgumentInterface
{
    /**
     * @var ScopeConfigInterface
     */
    private ScopeConfigInterface $scopeConfig;

    /**
     * @param ScopeConfigInterface $scopeConfig
     */
    public function __construct(
        ScopeConfigInterface $scopeConfig
    ) {
        $this->scopeConfig = $scopeConfig;
    }

    /**
     * Is Infinite Scroll for products list/grid is enabled
     *
     * @return bool
     */
    public function isInfiniteScroll(): bool
    {
        return $this->scopeConfig->isSetFlag(
            'catalog/layered_navigation/infinite_scroll',
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Is Save Scroll history (add &p= to url)
     *
     * @return bool
     */
    public function isSaveScrollHistory(): bool
    {
        return $this->isInfiniteScroll() && $this->scopeConfig->isSetFlag(
            'catalog/layered_navigation/save_scroll_history',
            ScopeInterface::SCOPE_STORE
        );
    }
}
