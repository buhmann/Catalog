<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
declare(strict_types=1);

namespace Buhmann\Catalog\Plugin\Block;

use Magento\LayeredNavigation\Block\Navigation as SubjectBlock;
use Buhmann\Catalog\ViewModel\LayeredNavigation as CatalogViewModel;

class Navigation
{
    /**
     * @var CatalogViewModel
     */
    private CatalogViewModel $viewModel;

    /**
     * @param CatalogViewModel $viewModel
     */
    public function __construct(CatalogViewModel $viewModel)
    {
        $this->viewModel = $viewModel;
    }

    /**
     * Switch template to custom AJAX component if AJAX navigation is enabled
     *
     * @param SubjectBlock $subject
     * @param string $result
     * @return string
     */
    public function afterGetTemplate(SubjectBlock $subject, string $result): string
    {
        if ($this->viewModel->isAjaxNavEnabled()) {
            $subject->setData('viewModel', $this->viewModel);
            $subject->setData('active', $this->getActiveFilters($subject));
            return 'Buhmann_Catalog::layer/view.phtml';
        }

        return $result;
    }

    /**
     * Return index of the facets that are expanded for the current page
     *
     * @param SubjectBlock $subject
     * @return string
     */
    private function getActiveFilters(SubjectBlock $subject): string
    {
        $activeFilters = [];

        $requestParams = array_keys($subject->getRequest()->getParams());
        $displayedFilters = $this->getDisplayedFilters($subject->getFilters());

        foreach ($displayedFilters as $index => $filter) {
            if (in_array($filter->getRequestVar(), $requestParams)) {
                $activeFilters[] = $index;
            }
        }

        return json_encode($activeFilters);
    }

    /**
     * Returns facet that are displayed.
     *
     * @param array $filters
     * @return array
     */
    private function getDisplayedFilters(array $filters): array
    {
        $displayedFilters = array_filter(
            $filters,
            function ($filter) {
                return $filter->getItemsCount() > 0;
            }
        );

        return array_values($displayedFilters);
    }
}
