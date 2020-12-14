import * as vscode from 'vscode';

import {QbsProductData} from '../datatypes/qbsproductdata';
import {QbsSession} from '../qbssession';

export async function displayRunProductSelector(session: QbsSession) {
    const products = (session.project()?.products() || [])
        .filter(product => product.isRunnable());
    interface QbsProductQuickPickItem extends vscode.QuickPickItem {
        product: QbsProductData;
    }

    const items: QbsProductQuickPickItem[] = products.map(product => {
        return {
            label: product.fullDisplayName(),
            product
        };
    });

    const selectedProduct = await vscode.window.showQuickPick(items).then(item => {
        return item?.product;
    });

    session.project()?.runStep().setup(selectedProduct, undefined);
}
