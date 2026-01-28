/**
 * SQL Tokenizer
 * Converts SQL query text into a stream of tokens
 */

import { createSyntaxError } from './errors.js';

export const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENT: 'IDENT',
  DOT: 'DOT',
  COMMA: 'COMMA',
  OP_EQ: 'OP_EQ',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  STAR: 'STAR',
  EOF: 'EOF',
};

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'INNER', 'JOIN', 'ON',
  'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'AND',
  'GROUP', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  // Unsupported keywords for error detection
  'HAVING', 'DISTINCT',
  'OR', 'NOT', 'LIKE', 'IN', 'BETWEEN', 'LEFT', 'RIGHT', 'OUTER', 'FULL',
]);

export class Token {
  constructor(type, value, start, end) {
    this.type = type;
    this.value = value;
    this.start = start;
    this.end = end;
  }
}

export class Tokenizer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const char = this.input[this.pos];

      if (char === ',' ) {
        this.tokens.push(new Token(TokenType.COMMA, ',', this.pos, this.pos + 1));
        this.pos++;
      } else if (char === '.') {
        this.tokens.push(new Token(TokenType.DOT, '.', this.pos, this.pos + 1));
        this.pos++;
      } else if (char === '=') {
        this.tokens.push(new Token(TokenType.OP_EQ, '=', this.pos, this.pos + 1));
        this.pos++;
      } else if (char === '*') {
        this.tokens.push(new Token(TokenType.STAR, '*', this.pos, this.pos + 1));
        this.pos++;
      } else if (char === '(') {
        this.tokens.push(new Token(TokenType.LPAREN, '(', this.pos, this.pos + 1));
        this.pos++;
      } else if (char === ')') {
        this.tokens.push(new Token(TokenType.RPAREN, ')', this.pos, this.pos + 1));
        this.pos++;
      } else if (char === "'") {
        this.readString();
      } else if (char === '"') {
        throw createSyntaxError(
          'Double-quoted strings are not allowed. Please use single quotes.',
          this.pos
        );
      } else if (this.isDigit(char)) {
        this.readNumber();
      } else if (this.isIdentStart(char)) {
        this.readIdentOrKeyword();
      } else {
        throw createSyntaxError(
          `Unexpected character: '${char}'`,
          this.pos
        );
      }
    }

    this.tokens.push(new Token(TokenType.EOF, '', this.pos, this.pos));
    return this.tokens;
  }

  skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  isDigit(char) {
    return /[0-9]/.test(char);
  }

  isIdentStart(char) {
    return /[A-Za-z_]/.test(char);
  }

  isIdentPart(char) {
    return /[A-Za-z0-9_]/.test(char);
  }

  readNumber() {
    const start = this.pos;
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      this.pos++;
    }
    const value = this.input.substring(start, this.pos);
    this.tokens.push(new Token(TokenType.NUMBER, value, start, this.pos));
  }

  readString() {
    const start = this.pos;
    this.pos++; // skip opening '

    let value = '';
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      
      if (char === "'") {
        // Check for escaped quote ''
        if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === "'") {
          value += "'";
          this.pos += 2;
        } else {
          // End of string
          this.pos++;
          this.tokens.push(new Token(TokenType.STRING, value, start, this.pos));
          return;
        }
      } else {
        value += char;
        this.pos++;
      }
    }

    throw createSyntaxError('Unterminated string literal', start);
  }

  readIdentOrKeyword() {
    const start = this.pos;
    while (this.pos < this.input.length && this.isIdentPart(this.input[this.pos])) {
      this.pos++;
    }
    const value = this.input.substring(start, this.pos);
    const upperValue = value.toUpperCase();
    
    const type = KEYWORDS.has(upperValue) ? TokenType.KEYWORD : TokenType.IDENT;
    this.tokens.push(new Token(type, value, start, this.pos));
  }
}

export function tokenize(input) {
  const tokenizer = new Tokenizer(input);
  return tokenizer.tokenize();
}
