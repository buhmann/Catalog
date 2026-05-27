/**
 * Copyright © Magento. All rights reserved.
 * See COPYING.txt for license details.
 */
var config = {
    map: {
        '*': {
            'infiniteScroll': 'Buhmann_Catalog/js/infinite-scroll',
        }
    },
    config: {
        mixins: {
            'Magento_Catalog/js/product/list/toolbar': {
                'Buhmann_Catalog/js/product/list/toolbar': true
            },
            'Smile_ElasticsuiteCatalog/js/attribute-filter': {
                'Buhmann_Catalog/js/mixin/attribute-filter': true
            },
        },
    }
};
