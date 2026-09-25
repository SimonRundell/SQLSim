/**
 * SQL Parser
 * Parses tokens into an Abstract Syntax Tree (AST)
 */

import { TokenType } from './tokenizer.js';
import { createSyntaxError } from './errors.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse() {
    const statement = this.parseStatement();
    // Allow optional semicolon at end
    if (this.check(TokenType.SEMICOLON)) {
      this.advance();
    }
    this.expect(TokenType.EOF);
    return statement;
  }

  parseStatement() {
    // statement := SELECT query | CREATE TABLE | ALTER TABLE | DROP TABLE | INSERT | UPDATE | DELETE
    const token = this.current();
    
    if (this.checkKeyword('SELECT')) {
      return this.parseQuery();
    } else if (this.checkKeyword('CREATE')) {
      return this.parseCreateTable();
    } else if (this.checkKeyword('ALTER')) {
      return this.parseAlterTable();
    } else if (this.checkKeyword('DROP')) {
      return this.parseDropTable();
    } else if (this.checkKeyword('INSERT')) {
      return this.parseInsert();
    } else if (this.checkKeyword('UPDATE')) {
      return this.parseUpdate();
    } else if (this.checkKeyword('DELETE')) {
      return this.parseDelete();
    } else {
      throw createSyntaxError(
        `Expected SELECT, CREATE, ALTER, DROP, INSERT, UPDATE, or DELETE, got ${token.type === TokenType.KEYWORD ? token.value : token.type}`,
        token.start
      );
    }
  }

  parseQuery() {
    // query := SELECT select_list FROM table_ref [join_clause]* [where_clause] [group_by_clause] [having_clause] [order_clause] [limit_clause]
    // Also used to parse subqueries (in WHERE and as a FROM-clause derived table).
    const startToken = this.current();
    this.expectKeyword('SELECT');
    let isDistinct = false;
    if (this.checkKeyword('DISTINCT')) {
      this.advance();
      isDistinct = true;
    }

    const select = this.parseSelectList();
    select.distinct = isDistinct;

    this.expectKeyword('FROM');
    const from = this.parseTableRef();

    const joins = [];
    while (
      this.checkKeyword('INNER') || this.checkKeyword('JOIN') ||
      this.checkKeyword('LEFT') || this.checkKeyword('RIGHT') || this.checkKeyword('FULL')
    ) {
      joins.push(this.parseJoinClause());
    }

    let where = null;
    if (this.checkKeyword('WHERE')) {
      where = this.parseWhereClause();
    }

    let groupBy = null;
    if (this.checkKeyword('GROUP')) {
      groupBy = this.parseGroupByClause();
    }

    let having = null;
    if (this.checkKeyword('HAVING')) {
      having = this.parseHavingClause();
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
      joins,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      position: startToken.start,
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
    // select_item := (aggregate_function | column_ref) [AS alias]
    // aggregate_function := (COUNT|SUM|AVG|MIN|MAX) "(" ("*" | column_ref) ")"
    
    const token = this.current();
    
    let item;
    // Check if this is an aggregate function
    const aggFuncs = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
    if (token.type === TokenType.KEYWORD && aggFuncs.includes(token.value.toUpperCase())) {
      item = this.parseAggregateFunction();
    } else {
      item = this.parseColumnRef();
    }
    
    // Check for optional AS alias
    let alias = null;
    if (this.checkKeyword('AS')) {
      this.advance(); // consume 'AS'
      const aliasToken = this.expect(TokenType.IDENT);
      alias = aliasToken.value;
    } else if (this.check(TokenType.IDENT) && !this.checkKeyword('FROM') && !this.checkKeyword('WHERE') && !this.checkKeyword('GROUP') && !this.checkKeyword('ORDER') && !this.checkKeyword('LIMIT') && !this.check(TokenType.COMMA)) {
      // Support alias without AS keyword (e.g., SELECT name fullname)
      const aliasToken = this.expect(TokenType.IDENT);
      alias = aliasToken.value;
    }
    
    if (alias) {
      item.alias = alias;
    }
    
    return item;
  }

  parseAggregateFunction() {
    // aggregate_function := (COUNT|SUM|AVG|MIN|MAX) "(" ("*" | column_ref) ")"
    const funcToken = this.current();
    const funcName = funcToken.value.toUpperCase();
    
    // Accept any of the aggregate functions
    if (!['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(funcName)) {
      throw createSyntaxError(
        `Expected aggregate function (COUNT, SUM, AVG, MIN, MAX), got ${funcName}`,
        funcToken.start
      );
    }
    
    this.advance(); // consume the function name
    this.expect(TokenType.LPAREN);

    let argument;
    if (this.check(TokenType.STAR)) {
      // Only COUNT supports * argument
      if (funcName !== 'COUNT') {
        throw createSyntaxError(
          `${funcName} does not support * argument, use a column name`,
          this.current().start
        );
      }
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
    // table_ref := IDENT [ [AS] IDENT ]  |  "(" query ")" [AS] IDENT
    if (this.check(TokenType.LPAREN)) {
      const token = this.current();
      this.advance();
      const query = this.parseQuery();
      this.expect(TokenType.RPAREN);

      // Unlike a base table, a derived table has no name of its own, so an
      // alias is mandatory - otherwise there'd be nothing to qualify its
      // columns with elsewhere in the query.
      if (this.checkKeyword('AS')) {
        this.advance();
      } else if (!this.check(TokenType.IDENT)) {
        throw createSyntaxError(
          "A derived table (subquery in FROM) must have an alias, e.g. FROM (SELECT ...) AS t",
          this.current().start
        );
      }
      const alias = this.expect(TokenType.IDENT).value;

      return { type: 'DerivedTable', query, alias, position: token.start };
    }

    const token = this.expect(TokenType.IDENT);
    const alias = this.parseOptionalAlias();
    return { type: 'Table', name: token.value, alias };
  }

  parseJoinClause() {
    // join_clause := ( [INNER] | LEFT [OUTER] | RIGHT [OUTER] | FULL [OUTER] )
    //                JOIN IDENT [ [AS] IDENT ] ON column_ref "=" column_ref
    let joinType = 'INNER';

    if (this.checkKeyword('INNER')) {
      this.advance();
      joinType = 'INNER';
    } else if (this.checkKeyword('LEFT')) {
      this.advance();
      if (this.checkKeyword('OUTER')) this.advance();
      joinType = 'LEFT';
    } else if (this.checkKeyword('RIGHT')) {
      this.advance();
      if (this.checkKeyword('OUTER')) this.advance();
      joinType = 'RIGHT';
    } else if (this.checkKeyword('FULL')) {
      this.advance();
      if (this.checkKeyword('OUTER')) this.advance();
      joinType = 'FULL';
    }

    this.expectKeyword('JOIN');

    if (this.check(TokenType.LPAREN)) {
      throw createSyntaxError(
        'Derived tables (subqueries) are only supported in the main FROM clause, not in JOIN',
        this.current().start
      );
    }

    const table = this.expect(TokenType.IDENT).value;
    const alias = this.parseOptionalAlias();

    this.expectKeyword('ON');
    const left = this.parseColumnRef();
    this.expect(TokenType.OP_EQ);
    const right = this.parseColumnRef();

    return {
      type: 'Join',
      joinType,
      table,
      alias,
      on: { left, right },
    };
  }

  parseOptionalAlias() {
    // [AS] IDENT - used for table aliases in FROM/JOIN
    if (this.checkKeyword('AS')) {
      this.advance();
      return this.expect(TokenType.IDENT).value;
    }
    if (this.check(TokenType.IDENT)) {
      // Support alias without AS keyword (e.g., FROM students s)
      return this.expect(TokenType.IDENT).value;
    }
    return null;
  }

  parseWhereClause() {
    // where_clause := WHERE or_expr
    this.expectKeyword('WHERE');
    const expr = this.parseOrExpr();
    return { type: 'Where', expr };
  }

  parseOrExpr() {
    // or_expr := and_expr (OR and_expr)*
    let left = this.parseAndExpr();
    while (this.checkKeyword('OR')) {
      this.advance();
      const right = this.parseAndExpr();
      left = { type: 'Or', left, right };
    }
    return left;
  }

  parseAndExpr() {
    // and_expr := not_expr (AND not_expr)*
    let left = this.parseNotExpr();
    while (this.checkKeyword('AND')) {
      this.advance();
      const right = this.parseNotExpr();
      left = { type: 'And', left, right };
    }
    return left;
  }

  parseNotExpr() {
    // not_expr := NOT not_expr | primary_predicate
    if (this.checkKeyword('NOT')) {
      const token = this.advance();
      const expr = this.parseNotExpr();
      return { type: 'Not', expr, position: token.start };
    }
    return this.parsePrimaryPredicate();
  }

  parsePrimaryPredicate() {
    // primary_predicate := "(" or_expr ")"
    //                    | [NOT] EXISTS "(" query ")"
    //                    | TRUE | FALSE
    //                    | operand [NOT] IN "(" literal ("," literal)* ")"
    //                    | operand [NOT] IN "(" query ")"
    //                    | operand [NOT] BETWEEN operand AND operand
    //                    | operand operator (operand | "(" query ")")
    // operator := "=" | "!=" | "<>" | "<" | "<=" | ">" | ">=" | LIKE
    // (NOT EXISTS is just NOT wrapping EXISTS - parseNotExpr already handles
    // the leading NOT generically, so only EXISTS itself is handled here.)

    if (this.checkKeyword('EXISTS')) {
      const token = this.advance();
      this.expect(TokenType.LPAREN);
      const query = this.parseQuery();
      this.expect(TokenType.RPAREN);
      return { type: 'Exists', subquery: { type: 'Subquery', query }, position: token.start };
    }

    // Parenthesized group - re-enter at the top of the precedence chain.
    // The resulting subtree already encodes the grouping, so it's returned
    // as-is; no wrapper node is needed.
    if (this.check(TokenType.LPAREN)) {
      if (this.peekKeyword('SELECT')) {
        throw createSyntaxError(
          "A subquery can't stand alone here. Use it with EXISTS (SELECT ...), value IN (SELECT ...), or value = (SELECT ...)",
          this.current().start
        );
      }
      this.advance();
      const expr = this.parseOrExpr();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    const operand = this.parseOperand();

    // Standalone boolean literal (no comparison operator following)
    if (operand.type === 'Literal' && operand.valueType === 'boolean') {
      const isFollowedByOperator =
        this.checkKeyword('LIKE') ||
        this.check(TokenType.OP_EQ) ||
        this.check(TokenType.OP_NE) ||
        this.check(TokenType.OP_LT) ||
        this.check(TokenType.OP_LE) ||
        this.check(TokenType.OP_GT) ||
        this.check(TokenType.OP_GE);

      if (!isFollowedByOperator) {
        return { type: 'BooleanLiteral', value: operand.value, position: operand.position };
      }
    }

    // [NOT] IN / [NOT] BETWEEN
    let negate = false;
    if (this.checkKeyword('NOT')) {
      this.advance();
      negate = true;
    }

    if (this.checkKeyword('IN')) {
      this.advance();
      this.expect(TokenType.LPAREN);

      if (this.checkKeyword('SELECT')) {
        const query = this.parseQuery();
        this.expect(TokenType.RPAREN);
        return { type: 'InSubquery', operand, subquery: { type: 'Subquery', query }, negate };
      }

      const values = [this.parseLiteral()];
      while (this.check(TokenType.COMMA)) {
        this.advance();
        values.push(this.parseLiteral());
      }
      this.expect(TokenType.RPAREN);
      return { type: 'In', operand, values, negate };
    }

    if (this.checkKeyword('BETWEEN')) {
      this.advance();
      const low = this.parseOperand();
      this.expectKeyword('AND');
      const high = this.parseOperand();
      return { type: 'Between', operand, low, high, negate };
    }

    if (negate) {
      throw createSyntaxError(
        `Expected IN or BETWEEN after NOT`,
        this.current().start
      );
    }

    let operator = '=';
    const token = this.current();

    if (this.checkKeyword('LIKE')) {
      operator = 'LIKE';
      this.advance();
    } else if (token.type === TokenType.OP_EQ) {
      operator = '=';
      this.advance();
    } else if (token.type === TokenType.OP_NE) {
      operator = '!=';
      this.advance();
    } else if (token.type === TokenType.OP_LT) {
      operator = '<';
      this.advance();
    } else if (token.type === TokenType.OP_LE) {
      operator = '<=';
      this.advance();
    } else if (token.type === TokenType.OP_GT) {
      operator = '>';
      this.advance();
    } else if (token.type === TokenType.OP_GE) {
      operator = '>=';
      this.advance();
    } else {
      throw createSyntaxError(
        `Expected comparison operator (=, !=, <, <=, >, >=, LIKE, IN, BETWEEN), got ${token.type}`,
        token.start
      );
    }

    let right;
    if (operator !== 'LIKE' && this.check(TokenType.LPAREN) && this.peekKeyword('SELECT')) {
      this.advance(); // consume LPAREN
      const query = this.parseQuery();
      this.expect(TokenType.RPAREN);
      right = { type: 'Subquery', query };
    } else {
      right = this.parseOperand();
    }

    return { type: 'Comparison', left: operand, operator, right };
  }

  parseOperand() {
    // operand := column_ref | literal | boolean | aggregate_function (HAVING only)
    if (
      this.check(TokenType.NUMBER) ||
      this.check(TokenType.STRING) ||
      this.checkKeyword('TRUE') ||
      this.checkKeyword('FALSE') ||
      this.checkKeyword('NULL')
    ) {
      return this.parseLiteral();
    }

    // Only meaningful in a HAVING clause (set by parseHavingClause), since
    // aggregates operate on already-grouped data - they don't make sense as
    // a WHERE/BETWEEN/IN operand, which run before grouping happens.
    if (this.allowAggregateOperands) {
      const token = this.current();
      const aggFuncs = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
      if (token.type === TokenType.KEYWORD && aggFuncs.includes(token.value.toUpperCase())) {
        return this.parseAggregateFunction();
      }
    }

    return this.parseColumnRef();
  }

  parseBooleanLiteral() {
    const token = this.current();
    const value = token.value.toUpperCase() === 'TRUE';
    this.advance();
    
    return {
      type: 'Literal',
      value,
      valueType: 'boolean',
      position: token.start,
    };
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

    if (this.checkKeyword('TRUE') || this.checkKeyword('FALSE')) {
      return this.parseBooleanLiteral();
    }

    if (this.checkKeyword('NULL')) {
      const nullToken = this.advance();
      return {
        type: 'Literal',
        value: null,
        valueType: 'null',
        position: nullToken.start,
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

  parseHavingClause() {
    // having_clause := HAVING or_expr
    // Reuses the same WHERE-predicate grammar (parseOrExpr/parseAndExpr/
    // parseNotExpr/parsePrimaryPredicate), just with aggregate functions
    // additionally allowed as operands - toggled via allowAggregateOperands
    // so it also applies inside any parenthesized sub-expression.
    this.expectKeyword('HAVING');
    const previousFlag = this.allowAggregateOperands;
    this.allowAggregateOperands = true;
    try {
      const expr = this.parseOrExpr();
      return { type: 'Having', expr };
    } finally {
      this.allowAggregateOperands = previousFlag;
    }
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

  parseCreateTable() {
    // CREATE TABLE table_name (column_name type, ...)
    this.expectKeyword('CREATE');
    this.expectKeyword('TABLE');
    
    const tableNameToken = this.expect(TokenType.IDENT);
    const tableName = tableNameToken.value;
    
    this.expect(TokenType.LPAREN);
    
    const columns = [];
    let primaryKey = null;
    do {
      if (this.check(TokenType.RPAREN)) break;

      const columnDef = this.parseColumnDefinition();
      if (columnDef.isPrimaryKey) {
        if (primaryKey && primaryKey !== columnDef.name) {
          throw createSyntaxError('Multiple primary keys are not supported', columnDef.position);
        }
        primaryKey = columnDef.name;
      }

      columns.push(columnDef);

      if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        break;
      }
    } while (!this.check(TokenType.RPAREN));
    
    this.expect(TokenType.RPAREN);
    
    return {
      type: 'CreateTable',
      tableName,
      columns,
      primaryKey,
    };
  }

  parseColumnDefinition() {
    const nameToken = this.expect(TokenType.IDENT);
    const { type, size } = this.parseColumnType();

    let isPrimaryKey = false;
    let autoIncrement = false;
    let notNull = false;
    let nullableSpecified = false;

    while (true) {
      if (this.checkKeyword('PRIMARY')) {
        this.advance();
        this.expectKeyword('KEY');
        isPrimaryKey = true;
        continue;
      }

      if (this.checkKeyword('AUTO_INCREMENT')) {
        this.advance();
        autoIncrement = true;
        continue;
      }

      if (this.checkKeyword('NOT')) {
        this.advance();
        this.expectKeyword('NULL');
        notNull = true;
        nullableSpecified = true;
        continue;
      }

      if (this.checkKeyword('NULL')) {
        this.advance();
        notNull = false;
        nullableSpecified = true;
        continue;
      }

      break;
    }

    if (isPrimaryKey || autoIncrement) {
      notNull = true;
    }

    return {
      name: nameToken.value,
      type,
      size,
      isPrimaryKey,
      autoIncrement,
      notNull,
      nullableSpecified,
      position: nameToken.start,
    };
  }

  parseColumnType() {
    const token = this.current();
    if (token.type !== TokenType.IDENT && token.type !== TokenType.KEYWORD) {
      throw createSyntaxError(
        `Expected column type, got ${token.type}`,
        token.start
      );
    }

    const rawType = token.value.toLowerCase();
    this.advance();

    let size = null;
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const sizeToken = this.expect(TokenType.NUMBER);
      size = Number(sizeToken.value);
      this.expect(TokenType.RPAREN);
    }

    const type = this.normalizeColumnType(rawType, token.start);

    return { type, size };
  }

  normalizeColumnType(rawType, position) {
    const type = rawType.toLowerCase();

    const numberTypes = ['number', 'int', 'integer', 'decimal', 'float', 'numeric', 'real', 'double'];
    const stringTypes = ['string', 'varchar', 'char', 'text'];
    const booleanTypes = ['boolean', 'bool'];

    if (numberTypes.includes(type)) return 'number';
    if (stringTypes.includes(type)) return 'string';
    if (booleanTypes.includes(type)) return 'boolean';

    throw createSyntaxError(
      `Unknown column type: ${rawType}. Use INT, DECIMAL, FLOAT, NUMERIC, VARCHAR, CHAR, TEXT, BOOLEAN, or compatible synonyms`,
      position
    );
  }

  parseAlterTable() {
    // ALTER TABLE table_name ADD COLUMN column_name type
    this.expectKeyword('ALTER');
    this.expectKeyword('TABLE');
    
    const tableNameToken = this.expect(TokenType.IDENT);
    const tableName = tableNameToken.value;
    
    this.expectKeyword('ADD');
    
    // COLUMN keyword is optional
    if (this.checkKeyword('COLUMN')) {
      this.advance();
    }
    
    const columnName = this.expect(TokenType.IDENT).value;
    const columnDetails = this.parseColumnType();

    let isPrimaryKey = false;
    let autoIncrement = false;
    let notNull = false;
    let nullableSpecified = false;

    while (true) {
      if (this.checkKeyword('PRIMARY')) {
        this.advance();
        this.expectKeyword('KEY');
        isPrimaryKey = true;
        continue;
      }

      if (this.checkKeyword('AUTO_INCREMENT')) {
        this.advance();
        autoIncrement = true;
        continue;
      }

      if (this.checkKeyword('NOT')) {
        this.advance();
        this.expectKeyword('NULL');
        notNull = true;
        nullableSpecified = true;
        continue;
      }

      if (this.checkKeyword('NULL')) {
        this.advance();
        notNull = false;
        nullableSpecified = true;
        continue;
      }

      break;
    }

    if (isPrimaryKey || autoIncrement) {
      notNull = true;
    }

    return {
      type: 'AlterTable',
      tableName,
      action: 'ADD_COLUMN',
      column: {
        name: columnName,
        type: columnDetails.type,
        size: columnDetails.size,
        isPrimaryKey,
        autoIncrement,
        notNull,
        nullableSpecified,
      },
    };
  }

  parseDropTable() {
    // DROP TABLE table_name
    this.expectKeyword('DROP');
    this.expectKeyword('TABLE');
    
    const tableNameToken = this.expect(TokenType.IDENT);
    const tableName = tableNameToken.value;
    
    return {
      type: 'DropTable',
      tableName,
    };
  }

  parseInsert() {
    // INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
    this.expectKeyword('INSERT');
    this.expectKeyword('INTO');
    
    const tableNameToken = this.expect(TokenType.IDENT);
    const tableName = tableNameToken.value;
    
    this.expect(TokenType.LPAREN);
    const columns = [];
    do {
      if (this.check(TokenType.RPAREN)) break;
      columns.push(this.expect(TokenType.IDENT).value);
      if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        break;
      }
    } while (!this.check(TokenType.RPAREN));
    this.expect(TokenType.RPAREN);
    
    this.expectKeyword('VALUES');
    
    this.expect(TokenType.LPAREN);
    const values = [];
    do {
      if (this.check(TokenType.RPAREN)) break;
      values.push(this.parseLiteral());
      if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        break;
      }
    } while (!this.check(TokenType.RPAREN));
    this.expect(TokenType.RPAREN);
    
    return {
      type: 'Insert',
      tableName,
      columns,
      values,
    };
  }

  parseUpdate() {
    // UPDATE table_name SET column1 = value1, column2 = value2 WHERE condition
    this.expectKeyword('UPDATE');
    
    const tableNameToken = this.expect(TokenType.IDENT);
    const tableName = tableNameToken.value;
    
    this.expectKeyword('SET');
    
    const assignments = [];
    do {
      const columnName = this.expect(TokenType.IDENT).value;
      this.expect(TokenType.OP_EQ);
      const value = this.parseLiteral();
      assignments.push({ column: columnName, value });
      
      if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        break;
      }
    } while (!this.checkKeyword('WHERE') && !this.check(TokenType.EOF));
    
    let where = null;
    if (this.checkKeyword('WHERE')) {
      where = this.parseWhereClause();
    }
    
    return {
      type: 'Update',
      tableName,
      assignments,
      where,
    };
  }

  parseDelete() {
    // DELETE FROM table_name WHERE condition
    this.expectKeyword('DELETE');
    this.expectKeyword('FROM');
    
    const tableNameToken = this.expect(TokenType.IDENT);
    const tableName = tableNameToken.value;
    
    let where = null;
    if (this.checkKeyword('WHERE')) {
      where = this.parseWhereClause();
    }
    
    return {
      type: 'Delete',
      tableName,
      where,
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

  peekKeyword(keyword, offset = 1) {
    const token = this.tokens[this.pos + offset];
    return Boolean(token) && token.type === TokenType.KEYWORD &&
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

/**
 * Parses every statement in `tokens`, separated by semicolons - the query
 * editor runs a whole submission (e.g. a CREATE TABLE, a couple of INSERTs,
 * then a SELECT) as one sequence, not just the first statement in it. A
 * trailing semicolon at the very end is still optional.
 */
export function parseStatements(tokens) {
  const parser = new Parser(tokens);
  const statements = [];

  while (!parser.check(TokenType.EOF)) {
    statements.push(parser.parseStatement());

    if (parser.check(TokenType.SEMICOLON)) {
      parser.advance();
    } else if (!parser.check(TokenType.EOF)) {
      const token = parser.current();
      throw createSyntaxError(
        `Expected ; between statements, got ${token.type === TokenType.KEYWORD ? token.value : token.type}`,
        token.start
      );
    }
  }

  if (statements.length === 0) {
    throw createSyntaxError('Empty query', 0);
  }

  return statements;
}
