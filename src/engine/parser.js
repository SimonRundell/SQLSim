/**
 * SQL Parser
 * Parses tokens into an Abstract Syntax Tree (AST)
 */

import { TokenType } from './tokenizer.js';
import { createSyntaxError, createUnsupportedFeatureError } from './errors.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse() {
    const query = this.parseQuery();
    this.expect(TokenType.EOF);
    return query;
  }

  parseQuery() {
    // query := SELECT select_list FROM table_ref [join_clause] [where_clause] [group_by_clause] [order_clause] [limit_clause]
    this.expectKeyword('SELECT');
    const select = this.parseSelectList();

    this.expectKeyword('FROM');
    const from = this.parseTableRef();

    let join = null;
    if (this.checkKeyword('INNER') || this.checkKeyword('JOIN')) {
      join = this.parseJoinClause();
    }

    let where = null;
    if (this.checkKeyword('WHERE')) {
      where = this.parseWhereClause();
    }

    let groupBy = null;
    if (this.checkKeyword('GROUP')) {
      groupBy = this.parseGroupByClause();
    }

    let orderBy = null;
    if (this.checkKeyword('ORDER')) {
      orderBy = this.parseOrderClause();
    }

    let limit = null;
    if (this.checkKeyword('LIMIT')) {
      limit = this.parseLimitClause();
    }

    return {
      type: 'Query',
      select,
      from,
      join,
      where,
      groupBy,
      orderBy,
      limit,
    };
  }

  parseSelectList() {
    // select_list := "*" | select_item ("," select_item)*
    if (this.check(TokenType.STAR)) {
      this.advance();
      return { type: 'Select', star: true, items: [] };
    }

    const items = [];
    items.push(this.parseSelectItem());

    while (this.check(TokenType.COMMA)) {
      this.advance();
      items.push(this.parseSelectItem());
    }

    return { type: 'Select', star: false, items };
  }

  parseSelectItem() {
    // select_item := aggregate_function | column_ref
    // aggregate_function := COUNT "(" ("*" | column_ref) ")"
    
    const token = this.current();
    
    // Check if this is an aggregate function (COUNT followed by '(')
    if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'COUNT') {
      return this.parseAggregateFunction();
    }
    
    return this.parseColumnRef();
  }

  parseAggregateFunction() {
    // aggregate_function := COUNT "(" ("*" | column_ref) ")"
    const funcToken = this.current();
    const funcName = funcToken.value.toUpperCase();
    this.expectKeyword('COUNT');
    this.expect(TokenType.LPAREN);

    let argument;
    if (this.check(TokenType.STAR)) {
      this.advance();
      argument = { type: 'Star' };
    } else {
      argument = this.parseColumnRef();
    }

    this.expect(TokenType.RPAREN);

    return {
      type: 'AggregateFunction',
      function: funcName,
      argument,
      position: funcToken.start,
    };
  }

  parseTableRef() {
    // table_ref := IDENT
    const token = this.expect(TokenType.IDENT);
    return { type: 'Table', name: token.value };
  }

  parseJoinClause() {
    // join_clause := [INNER] JOIN IDENT ON column_ref "=" column_ref
    let joinType = 'INNER';
    
    if (this.checkKeyword('INNER')) {
      this.advance();
      joinType = 'INNER';
    }

    this.expectKeyword('JOIN');
    const table = this.expect(TokenType.IDENT).value;

    this.expectKeyword('ON');
    const left = this.parseColumnRef();
    this.expect(TokenType.OP_EQ);
    const right = this.parseColumnRef();

    return {
      type: 'Join',
      joinType,
      table,
      on: { left, right },
    };
  }

  parseWhereClause() {
    // where_clause := WHERE predicate
    this.expectKeyword('WHERE');
    return this.parsePredicate();
  }

  parsePredicate() {
    // predicate := comparison (AND comparison)*
    const comparisons = [];
    comparisons.push(this.parseComparison());

    while (this.checkKeyword('AND')) {
      this.advance();
      comparisons.push(this.parseComparison());
    }

    return {
      type: 'Where',
      and: comparisons,
    };
  }

  parseComparison() {
    // comparison := operand "=" operand
    const left = this.parseOperand();
    this.expect(TokenType.OP_EQ);
    const right = this.parseOperand();

    return { left, right };
  }

  parseOperand() {
    // operand := column_ref | literal
    if (this.check(TokenType.NUMBER) || this.check(TokenType.STRING)) {
      return this.parseLiteral();
    }
    return this.parseColumnRef();
  }

  parseColumnRef() {
    // column_ref := IDENT [ "." IDENT ]
    const firstToken = this.expect(TokenType.IDENT);
    const firstName = firstToken.value;

    if (this.check(TokenType.DOT)) {
      this.advance();
      const secondToken = this.expect(TokenType.IDENT);
      return {
        type: 'ColumnRef',
        table: firstName,
        column: secondToken.value,
        position: firstToken.start,
      };
    }

    return {
      type: 'ColumnRef',
      table: null,
      column: firstName,
      position: firstToken.start,
    };
  }

  parseLiteral() {
    // literal := NUMBER | STRING
    const token = this.current();
    
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {
        type: 'Literal',
        value: Number(token.value),
        valueType: 'number',
        position: token.start,
      };
    }

    if (token.type === TokenType.STRING) {
      this.advance();
      return {
        type: 'Literal',
        value: token.value,
        valueType: 'string',
        position: token.start,
      };
    }

    throw createSyntaxError(
      `Expected literal, got ${token.type}`,
      token.start
    );
  }

  parseGroupByClause() {
    // group_by_clause := GROUP BY column_ref ("," column_ref)*
    this.expectKeyword('GROUP');
    this.expectKeyword('BY');

    const columns = [];
    columns.push(this.parseColumnRef());

    while (this.check(TokenType.COMMA)) {
      this.advance();
      columns.push(this.parseColumnRef());
    }

    return {
      type: 'GroupBy',
      columns,
    };
  }

  parseOrderClause() {
    // order_clause := ORDER BY column_ref [ASC|DESC]
    this.expectKeyword('ORDER');
    this.expectKeyword('BY');
    const column = this.parseColumnRef();

    let direction = 'ASC';
    if (this.checkKeyword('ASC')) {
      this.advance();
      direction = 'ASC';
    } else if (this.checkKeyword('DESC')) {
      this.advance();
      direction = 'DESC';
    }

    return {
      type: 'OrderBy',
      column,
      direction,
    };
  }

  parseLimitClause() {
    // limit_clause := LIMIT NUMBER
    this.expectKeyword('LIMIT');
    const token = this.expect(TokenType.NUMBER);
    const value = Number(token.value);

    if (value < 0 || !Number.isInteger(value)) {
      throw createSyntaxError(
        'LIMIT must be a non-negative integer',
        token.start
      );
    }

    return {
      type: 'Limit',
      value,
    };
  }

  // Helper methods
  current() {
    return this.tokens[this.pos];
  }

  advance() {
    this.pos++;
    return this.tokens[this.pos - 1];
  }

  check(type) {
    return this.current().type === type;
  }

  checkKeyword(keyword) {
    const token = this.current();
    return token.type === TokenType.KEYWORD && 
           token.value.toUpperCase() === keyword.toUpperCase();
  }

  expect(type) {
    const token = this.current();
    if (token.type !== type) {
      throw createSyntaxError(
        `Expected ${type}, got ${token.type}`,
        token.start
      );
    }
    return this.advance();
  }

  expectKeyword(keyword) {
    const token = this.current();
    
    // Check for unsupported features
    const unsupportedKeywords = ['HAVING', 'DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX', 'OR', 'NOT', 'LIKE', 'IN', 'BETWEEN', 'LEFT', 'RIGHT', 'OUTER', 'FULL'];
    if (token.type === TokenType.KEYWORD && unsupportedKeywords.includes(token.value.toUpperCase())) {
      throw createUnsupportedFeatureError(token.value.toUpperCase(), token.start);
    }

    if (token.type !== TokenType.KEYWORD || token.value.toUpperCase() !== keyword.toUpperCase()) {
      throw createSyntaxError(
        `Expected keyword ${keyword}, got ${token.type === TokenType.KEYWORD ? token.value : token.type}`,
        token.start
      );
    }
    return this.advance();
  }
}

export function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}
