<?php

namespace Buhmann\Catalog\Plugin\Block;

use Smile\ElasticsuiteCatalog\Block\Navigation as SubjectBlock;
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
     * Dynamically override layout template based on custom AJAX configuration state
     *
     * @param SubjectBlock $subject
     * @param callable $proceed
     * @return string
     */
    public function aroundGetTemplate(SubjectBlock $subject, callable $proceed)
    {
        if ($this->viewModel->isAjaxNavEnabled()) {
            return 'Buhmann_Catalog::layer/view.phtml';
        }

        return $proceed();
    }
}
