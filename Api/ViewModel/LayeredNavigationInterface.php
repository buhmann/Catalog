<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
declare(strict_types=1);

namespace Buhmann\Catalog\Api\ViewModel;

/**
 * Interface for layered navigation configuration view model
 */
interface LayeredNavigationInterface
{
    /**
     * Configuration paths
     */
    public const string XML_PATH_INFINITE_SCROLL = 'catalog/layered_navigation/infinite_scroll';
    public const string XML_PATH_SAVE_SCROLL_HISTORY = 'catalog/layered_navigation/save_scroll_history';
    public const string XML_PATH_AJAX_LAYERED_NAV = 'catalog/layered_navigation/ajax_layered_nav';
    public const string XML_PATH_MAX_FILTER_ITEMS = 'catalog/layered_navigation/max_filter_items';
    public const string XML_PATH_DISPLAY_PRODUCT_COUNT = 'catalog/layered_navigation/display_product_count';
    public const string XML_PATH_IS_MULTIPLE_SELECT = 'catalog/layered_navigation/is_multiple_select';

    /**
     * Check if Advanced Catalog extension is enabled
     *
     * @return bool
     */
    public function isAdvancedCatalogEnabled(): bool;

    /**
     * Check if Infinite Scroll is enabled
     *
     * @return bool
     */
    public function isInfiniteScroll(): bool;

    /**
     * Check if AJAX Navigation is enabled
     *
     * @return bool
     */
    public function isAjaxNavEnabled(): bool;

    /**
     * Check if multi-select is enabled for filters
     *
     * @return bool
     */
    public function isMultiSelectEnabled(): bool;
}
