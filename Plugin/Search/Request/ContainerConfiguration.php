<?php

namespace Buhmann\Catalog\Plugin\Search\Request;

use Magento\Framework\App\RequestInterface;
use Smile\ElasticsuiteCore\Search\Request\ContainerConfiguration as SourceContainerConfiguration;

class ContainerConfiguration
{
    /**
     * @var RequestInterface
     */
    private RequestInterface $request;

    /**
     * @param RequestInterface $request
     */
    public function __construct(
        RequestInterface $request
    ) {
        $this->request = $request;
    }

    /**
     * Modify container aggregations size dynamically for AJAX requests.
     *
     * @param SourceContainerConfiguration $subject
     * @param array $result
     * @return array
     * @SuppressWarnings(PHPMD.UnusedFormalParameter)
     */
    public function afterGetAggregations(SourceContainerConfiguration $subject, array $result): array
    {
        if ($this->request->getParam('isAjax') && !empty($result)) {
            foreach ($result as $bucketName => $bucketConfig) {
                if (isset($bucketConfig['size'])) {
                    $result[$bucketName]['size'] = 0;
                }
            }
        }

        return $result;
    }
}
