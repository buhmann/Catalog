<?php

namespace Buhmann\Catalog\Plugin\Block\Navigation\Renderer;

use Smile\ElasticsuiteCatalog\Block\Navigation\Renderer\Category as SubjectBlock;
use Buhmann\Catalog\ViewModel\LayeredNavigation as CatalogViewModel;

class Category
{
    /**
     * @var CatalogViewModel
     */
    private $viewModel;

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
            return 'Buhmann_Catalog::layer/filter/category.phtml';
        }

        return $proceed();
    }
}
