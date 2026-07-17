<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
declare(strict_types=1);

namespace Buhmann\Catalog\Plugin\Model\Layer\Filter;

use Buhmann\Catalog\Api\ViewModel\LayeredNavigationInterface as CatalogViewModel;
use Magento\Catalog\Model\Layer\Filter\FilterInterface;
use Magento\Framework\Exception\LocalizedException;

class FilterItems
{
    /**
     * @var CatalogViewModel
     */
    private CatalogViewModel $viewModel;

    /**
     * @param CatalogViewModel $viewModel
     */
    public function __construct(
        CatalogViewModel $viewModel
    ) {
        $this->viewModel = $viewModel;
    }

    /**
     * Process filter items after they are loaded
     *
     * @param FilterInterface $subject
     * @param array $result
     * @return array
     * @throws LocalizedException
     */
    public function afterGetItems(FilterInterface $subject, $result): array
    {
        if (!$this->viewModel->isMultiSelectEnabled()) {
            return $result;
        }

        $selectedValues = $this->getSelectedValues($subject);

        foreach ($result as $item) {
            /** @var \Magento\Catalog\Model\Layer\Filter\Item $item */
            $isSelected = in_array($item->getValue(), $selectedValues, true);

            if ($isSelected) {
                $item->setIsSelected(true);
            }
        }

        return $result;
    }

    /**
     * Get selected values for current filter
     *
     * @param FilterInterface $filter
     * @return array
     * @throws LocalizedException
     */
    private function getSelectedValues(FilterInterface $filter): array
    {
        $values = [];
        $state = $filter->getLayer()->getState();
        $requestVar = $filter->getRequestVar();

        foreach ($state->getFilters() as $stateFilter) {
            if ($stateFilter->getFilter()->getRequestVar() === $requestVar) {
                $values = (array)$stateFilter->getValue();
                break;
            }
        }

        return $values;
    }
}
