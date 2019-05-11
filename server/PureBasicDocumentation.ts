import {
	TextDocument,
	TextDocumentIdentifier,
	TextDocuments,
} from 'vscode-languageserver';

import { pb } from './PureBasicAPI';

export class PureBasicDocumentation extends TextDocuments {
	/**
	 * Find doc instance identified by `docInfo`
	 * @param docInfo
	 */
	public find(docInfo: TextDocumentIdentifier | string): Thenable<TextDocument> {
		let doc: TextDocument | undefined;
		if (typeof (docInfo) === 'string') {
			doc = pb.documentation.get(docInfo);
		}
		else {
			doc = pb.documentation.get(docInfo.uri);
		}
		return doc ? Promise.resolve(doc) : Promise.reject(`Invalid docInfo: ${docInfo.toString()}`);
	}
}