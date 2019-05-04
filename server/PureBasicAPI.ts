import {
	ProposedFeatures,
	createConnection
} from 'vscode-languageserver';

import { PureBasicCompletion } from './PureBasicCompletion';
import { PureBasicDocumentation } from './PureBasicDocumentation';
import { PureBasicFormatter } from './PureBasicFormatter';
import { PureBasicIndentation } from './PureBasicIndentation';
import { PureBasicParser } from './PureBasicParser';
import { PureBasicSettings } from './PureBasicSettings';
import { PureBasicSymbols } from './PureBasicSymbols';
import { PureBasicText } from './PureBasicText';
import { PureBasicValidation } from './PureBasicValidation';

export * from './PureBasicDataModels';
export namespace pb {
	/**
	 * Provide functions used to save or load all language custom settings
	 */
	export const settings = new PureBasicSettings();
	/**
	 * Provide functions used to examine and modify text from source code
	 */
	export const text = new PureBasicText();
	/**
	 * Provide functions used to beautify source code by following some formatting rules
	 */
	export const formatter = new PureBasicFormatter();
	/**
	 * Provide functions used to create regex parser
	 */
	export const parser = new PureBasicParser();
	/**
	 * Provide functions used to display code autocompletion list
	 */
	export const completion = new PureBasicCompletion();
	/**
	 * Provide functions used to indent source code
	 */
	export const indentation = new PureBasicIndentation();
	/**
	 * Provide functions used to analyze source code and retrieve diagnostic report
	 */
	export const validation = new PureBasicValidation();
	/**
	 * Provide functions used to collect symbols (variables, functions, types...) from document or workspace by parsing some texts
	 */
	export const symbols = new PureBasicSymbols();
	/**
	 * Provide functions used to find and manage text documents.
	 * This doc manager handles full document sync events.
	 */
	export const documentation = new PureBasicDocumentation();
	/**
	 * Provide a connection for the server. The connection uses Node's IPC as a transport.
	 * Also include all preview / proposed LSP features.
	 */
	export const connection = createConnection(ProposedFeatures.all);
}