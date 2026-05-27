<?php

namespace Buhmann\Catalog\Plugin\Block\Navigation\Renderer;

use Buhmann\Catalog\ViewModel\LayeredNavigation as CatalogViewModel;
use Magento\Swatches\Block\LayeredNavigation\RenderLayered as SubjectBlock;

class RenderLayered
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
     * Switch native swatch filter template to custom AJAX Knockout implementation
     *
     * @param SubjectBlock $subject
     * @param callable $proceed
     * @return string
     */
    public function aroundGetTemplate(SubjectBlock $subject, callable $proceed)
    {
        if ($this->viewModel->isAjaxNavEnabled()) {
            return 'Buhmann_Catalog::layer/filter/swatch.phtml';
        }

        return $proceed();
    }
}
