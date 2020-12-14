import * as vscode from 'vscode';

import {QbsProductData} from '../datatypes/qbsproductdata';
import {QbsSession} from '../qbssession';

export async function displayBuildProductSelector(session: QbsSession) {
    const products = [
        new QbsProductData('all'),
        ...session.project()?.products() || []
    ];
    interface QbsProductQuickPickItem extends vscode.QuickPickItem {
        product: QbsProductData;
    }

    const items: QbsProductQuickPickItem[] = products?.map(product => {
        return {
            label: product.isEmpty() ? '[all]' : product.fullDisplayName(),
            product
        };
    });

    const selectedProduct = await vscode.window.showQuickPick(items).then(item => {
        return item?.product;
    });

    session.project()?.buildStep().setup(undefined, undefined, selectedProduct);
}
