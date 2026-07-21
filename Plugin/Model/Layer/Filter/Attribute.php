<?php
/**
 * Copyright © Buhmann. All rights reserved.
 */
declare(strict_types=1);

namespace Buhmann\Catalog\Plugin\Model\Layer\Filter;

use Buhmann\Catalog\Api\ViewModel\LayeredNavigationInterface;
use Magento\CatalogSearch\Model\Layer\Filter\Attribute as Subject;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Exception\LocalizedException;
use ReflectionException;
use ReflectionMethod;

/**
 * Plugin to enable multi-select functionality for attribute filters
 */
class Attribute
{
    /**
     * @var LayeredNavigationInterface
     */
    private LayeredNavigationInterface $viewModel;

    /**
     * Constructor
     *
     * @param LayeredNavigationInterface $viewModel Layered navigation view model
     */
    public function __construct(
        LayeredNavigationInterface $viewModel
    ) {
        $this->viewModel = $viewModel;
    }

    /**
     * Around plugin for apply method to handle multi-select functionality
     *
     * @param Subject $subject The attribute filter instance
     * @param callable $proceed The original method
     * @param RequestInterface $request The request object
     * @return Subject The filter instance
     * @throws LocalizedException
     */
    public function aroundApply(Subject $subject, callable $proceed, RequestInterface $request)
    {
        $attributeValue = $request->getParam($subject->getRequestVar());

        // If multi-select is disabled or no value - use original method
        if (!$this->viewModel->isMultiSelectEnabled() || (empty($attributeValue) && !is_numeric($attributeValue))) {
            return $proceed($request);
        }

        // Handle multi-select logic
        return $this->applyMultiSelect($subject, $request, $attributeValue);
    }

    /**
     * Apply multi-select filter logic
     *
     * @param Subject $subject The attribute filter instance
     * @param RequestInterface $request The request object
     * @param mixed $attributeValue The attribute value(s) from request
     * @return Subject The filter instance
     * @throws LocalizedException
     */
    private function applyMultiSelect(Subject $subject, RequestInterface $request, $attributeValue): Subject
    {
        // Convert to array if single value
        if (!is_array($attributeValue)) {
            $attributeValue = [$attributeValue];
        }

        $attribute = $subject->getAttributeModel();
        $productCollection = $subject->getLayer()->getProductCollection();

        // Apply filter to collection with OR logic
        $productCollection->addFieldToFilter(
            $attribute->getAttributeCode(),
            $attributeValue
        );

        // Add selected values to state
        $labels = [];
        foreach ($attributeValue as $value) {
            $label = $subject->getOptionText($value);
            $labels[] = is_array($label) ? $label : [$label];
        }
        $label = implode(',', array_unique(array_merge([], ...$labels)));

        $item = $this->createItem($subject, $label, $attributeValue);
        $subject->getLayer()->getState()->addFilter($item);

        return $subject;
    }

    /**
     * Create filter item using reflection to access protected _createItem method
     *
     * @param Subject $subject The attribute filter instance
     * @param string $label The item label
     * @param mixed $value The item value
     * @return \Magento\Catalog\Model\Layer\Filter\Item The created filter item
     */
    private function createItem(Subject $subject, string $label, $value)
    {
        try {
            $reflectionMethod = new ReflectionMethod($subject, '_createItem');
            $reflectionMethod->setAccessible(true);
            return $reflectionMethod->invoke($subject, $label, $value);
        } catch (ReflectionException $e) {
            // If reflection fails, return null
            return null;
        }
    }
}
