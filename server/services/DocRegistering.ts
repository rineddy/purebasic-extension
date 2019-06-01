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

	public find(docIdentifier: TextDocumentIdentifier): Thenable<TextDocument> {
		const doc = this.get(docIdentifier.uri);
		return doc ? Promise.resolve(doc) : Promise.reject(`doc '${docIdentifier.uri}' not found!`);
	}
}