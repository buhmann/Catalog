<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
namespace Buhmann\Catalog\ViewModel;

use Buhmann\Catalog\Api\ViewModel\LayeredNavigationInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Store\Model\ScopeInterface;

class LayeredNavigation implements LayeredNavigationInterface, ArgumentInterface
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
     * Check if Advanced Catalog extension is enabled
     *
     * @return bool
     */
    public function isAdvancedCatalogEnabled(): bool
    {
        return $this->isAjaxNavEnabled() || $this->isInfiniteScroll();
    }

    /**
     * Is Infinite Scroll for products list/grid is enabled
     *
     * @return bool
     */
    public function isInfiniteScroll(): bool
    {
        return $this->scopeConfig->isSetFlag(
            self::XML_PATH_INFINITE_SCROLL,
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
            self::XML_PATH_SAVE_SCROLL_HISTORY,
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Is Ajax Navigation is enabled
     *
     * @return bool
     */
    public function isAjaxNavEnabled(): bool
    {
        return $this->scopeConfig->isSetFlag(
            self::XML_PATH_AJAX_LAYERED_NAV,
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Get maximum visible filter items count
     *
     * @return int
     */
    public function getMaxFilterItems(): int
    {
        $maxSize = $this->scopeConfig->getValue(
            self::XML_PATH_MAX_FILTER_ITEMS,
            ScopeInterface::SCOPE_STORE
        );

        return $maxSize ? (int)$maxSize : 10;
    }

    /**
     * Check if product count should be displayed next to filter options
     *
     * @return bool
     */
    public function displayProductCount(): bool
    {
        return $this->scopeConfig->isSetFlag(
            self::XML_PATH_DISPLAY_PRODUCT_COUNT,
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Check if multi-select is enabled for filters
     *
     * @return bool
     */
    public function isMultiSelectEnabled(): bool
    {
        return $this->scopeConfig->isSetFlag(
            self::XML_PATH_IS_MULTIPLE_SELECT,
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Check if multiple collapsible items are allowed
     *
     * @return bool
     */
    public function isMultipleCollapsible(): bool
    {
        return false;
    }
}
