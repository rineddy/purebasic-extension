import { DocSymbol } from './DocSymbol';
import { DocTokenizer } from '../helpers/DocTokenizer';

export interface ParsingContext {
	tokenizer: DocTokenizer;
	symbols: DocSymbol[];
	openedSymbols: DocSymbol[];
}
