import {QbsSession} from '../qbssession';

import * as QbsCommand from './qbscommands';

import {QbsBuildRequest} from '../datatypes/qbsbuildrequest';
import {QbsCleanRequest} from '../datatypes/qbscleanrequest';

export async function onRebuild(session: QbsSession) {
    const productNames = [session.project()?.buildStep().productName() || ''];
    const cleanRequest = new QbsCleanRequest(session.settings());
    cleanRequest.setProducts(productNames);
    await QbsCommand.onClean(session, cleanRequest, 1000);
    const buildRequest = new QbsBuildRequest(session.settings());
    buildRequest.setProducts(productNames);
    await QbsCommand.onBuild(session, buildRequest, 5000);
}
