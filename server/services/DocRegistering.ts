import {
	TextDocument,
	TextDocumentIdentifier,
	TextDocuments,
} from 'vscode-languageserver';

export class DocRegistering extends TextDocuments {
	public static service = new DocRegistering();

	private constructor() {
		super();
	}

	public find(docInfo: TextDocumentIdentifier | string): Thenable<TextDocument> {
		let doc: TextDocument | undefined;
		if (typeof (docInfo) === 'string') {
			doc = this.get(docInfo);
		}
		else {
			doc = this.get(docInfo.uri);
		}
		return doc ? Promise.resolve(doc) : Promise.reject(`Invalid docInfo: ${docInfo.toString()}`);
	}
}