/**
 * Copyright © Magento. All rights reserved.
 * See COPYING.txt for license details.
 */
var config = {
    map: {
        '*': {
            'infiniteScroll': 'Buhmann_Catalog/js/layered-navigation'
        }
    },
    config: {
        mixins: {
            'Magento_Catalog/js/product/list/toolbar': {
                'Buhmann_Catalog/js/product/list/toolbar': true
            }
        },
    }
};
