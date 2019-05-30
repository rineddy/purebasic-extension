import { ProposedFeatures, createConnection } from 'vscode-languageserver';

import { PureBasicLine } from './PureBasicLine';

export namespace pb {
	/**
	 * Provide functions used to parse and modify line structure and data
	 */
	export const line = new PureBasicLine();
	/**
	 * Provide a connection for the server. The connection uses Node's IPC as a transport.
	 * Also include all preview / proposed LSP features.
	 */
	export const connection = createConnection(ProposedFeatures.all);
}