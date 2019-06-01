import { DocTokenizer } from '../helpers';
import { DocSymbol } from '.';

export interface ParsingContext {
	tokenizer: DocTokenizer;
	symbols: DocSymbol[];
	openedSymbols: DocSymbol[];
}
