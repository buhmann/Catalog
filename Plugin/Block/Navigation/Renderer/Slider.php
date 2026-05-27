<?php

namespace Buhmann\Catalog\Plugin\Block\Navigation\Renderer;

use Buhmann\Catalog\ViewModel\LayeredNavigation as CatalogViewModel;
use Smile\ElasticsuiteCatalog\Block\Navigation\Renderer\Slider as SubjectBlock;

class Slider
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
     * Switch template to custom AJAX component if features are enabled in config
     *
     * @param SubjectBlock $subject
     * @param callable $proceed
     * @return string
     */
    public function aroundGetTemplate(SubjectBlock $subject, callable $proceed)
    {
        if ($this->viewModel->isAjaxNavEnabled()) {
            return 'Buhmann_Catalog::layer/filter/slider.phtml';
        }

        return $proceed();
    }
}
