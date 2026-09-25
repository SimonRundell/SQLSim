/**
 * Small SVG illustrations used by the Student Guide - a schema map of all
 * three sample tables, and a reusable two-table PK/FK relationship diagram
 * used to teach JOINs.
 */

const HEADER_HEIGHT = 38;
const ROW_HEIGHT = 30;
const BOX_WIDTH = 200;
const TOP_MARGIN = 10;

/**
 * A single table box: header bar, then one row per column. `keys` is an
 * array of { index, label } - a table can play more than one role at once
 * (e.g. students is both a JOIN target for tutor_groups and a JOIN source
 * for grades), so more than one row can be highlighted.
 */
function TableBox({ x, title, columns, keys, accent }) {
  const bodyHeight = columns.length * ROW_HEIGHT;
  const keyByIndex = new Map(keys.map(k => [k.index, k.label]));

  return (
    <g>
      <rect x={x} y={TOP_MARGIN} width={BOX_WIDTH} height={HEADER_HEIGHT} rx="6" fill={accent} />
      <text
        x={x + BOX_WIDTH / 2}
        y={TOP_MARGIN + HEADER_HEIGHT / 2 + 5}
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="white"
      >
        {title}
      </text>
      <rect
        x={x}
        y={TOP_MARGIN + HEADER_HEIGHT}
        width={BOX_WIDTH}
        height={bodyHeight}
        fill="white"
        stroke="#dee2e6"
      />
      {columns.map((col, i) => {
        const rowY = TOP_MARGIN + HEADER_HEIGHT + i * ROW_HEIGHT;
        const keyLabel = keyByIndex.get(i);
        const isKey = keyLabel !== undefined;
        return (
          <g key={col}>
            {isKey && <rect x={x} y={rowY} width={BOX_WIDTH} height={ROW_HEIGHT} fill="#fff3cd" />}
            {i > 0 && <line x1={x} y1={rowY} x2={x + BOX_WIDTH} y2={rowY} stroke="#eee" />}
            <text
              x={x + 12}
              y={rowY + ROW_HEIGHT / 2 + 4}
              fontSize="12.5"
              fontFamily="'Consolas', 'Monaco', monospace"
              fontWeight={isKey ? 700 : 400}
              fill={isKey ? '#856404' : '#333'}
            >
              {col}
            </text>
            {isKey && (
              <text
                x={x + BOX_WIDTH - 10}
                y={rowY + ROW_HEIGHT / 2 + 4}
                fontSize="10.5"
                fontWeight="700"
                fill="#e67700"
                textAnchor="end"
              >
                {keyLabel}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function keyRowCenterY(keyIndex) {
  return TOP_MARGIN + HEADER_HEIGHT + keyIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
}

/**
 * Two tables side by side with a curved arrow from the foreign key (FK) row
 * in one to the primary key (PK) row in the other - the diagram used to
 * introduce JOINs.
 */
export function JoinDiagram({
  leftTitle,
  leftColumns,
  leftKeyIndex,
  leftKeyLabel = 'FK',
  rightTitle,
  rightColumns,
  rightKeyIndex,
  rightKeyLabel = 'PK',
}) {
  const gap = 120;
  const leftX = 10;
  const rightX = leftX + BOX_WIDTH + gap;
  const width = rightX + BOX_WIDTH + 10;
  const maxRows = Math.max(leftColumns.length, rightColumns.length);
  const height = TOP_MARGIN + HEADER_HEIGHT + maxRows * ROW_HEIGHT + 10;

  const leftY = keyRowCenterY(leftKeyIndex);
  const rightY = keyRowCenterY(rightKeyIndex);
  const cx1 = leftX + BOX_WIDTH + gap * 0.4;
  const cx2 = rightX - gap * 0.4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="guide-diagram"
      role="img"
      aria-label={`Diagram: ${leftTitle}.${leftColumns[leftKeyIndex]} links to ${rightTitle}.${rightColumns[rightKeyIndex]}`}
    >
      <defs>
        <marker id="guide-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#0066cc" />
        </marker>
      </defs>
      <path
        d={`M ${leftX + BOX_WIDTH} ${leftY} C ${cx1} ${leftY}, ${cx2} ${rightY}, ${rightX} ${rightY}`}
        fill="none"
        stroke="#0066cc"
        strokeWidth="2.5"
        markerEnd="url(#guide-arrow)"
      />
      <TableBox x={leftX} title={leftTitle} columns={leftColumns} keys={[{ index: leftKeyIndex, label: leftKeyLabel }]} accent="#0066cc" />
      <TableBox x={rightX} title={rightTitle} columns={rightColumns} keys={[{ index: rightKeyIndex, label: rightKeyLabel }]} accent="#28a745" />
    </svg>
  );
}

/**
 * A map of all three sample tables and how they relate - students sits
 * between tutor_groups and grades, with a foreign key pointing to each.
 */
export function SchemaOverview() {
  const gap = 70;
  const leftX = 10;
  const midX = leftX + BOX_WIDTH + gap;
  const rightX = midX + BOX_WIDTH + gap;
  const width = rightX + BOX_WIDTH + 10;

  const tutorGroupsColumns = ['tutor_group_id', 'tutor_name', 'room'];
  const studentsColumns = ['student_id', 'forename', 'surname', 'tutor_group_id'];
  const gradesColumns = ['student_id', 'module', 'paper', 'score'];

  const height = TOP_MARGIN + HEADER_HEIGHT + studentsColumns.length * ROW_HEIGHT + 10;

  const tutorGroupsPkY = keyRowCenterY(0);
  const studentsFkY = keyRowCenterY(3);
  const studentsPkY = keyRowCenterY(0);
  const gradesFkY = keyRowCenterY(0);

  const cx1 = leftX + BOX_WIDTH + gap * 0.4;
  const cx2 = midX - gap * 0.4;
  const cx3 = midX + BOX_WIDTH + gap * 0.4;
  const cx4 = rightX - gap * 0.4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="guide-diagram"
      role="img"
      aria-label="Diagram: tutor_groups, students and grades and how their keys connect"
    >
      <defs>
        <marker id="guide-arrow-overview" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#0066cc" />
        </marker>
      </defs>
      <path
        d={`M ${midX} ${studentsFkY} C ${cx2} ${studentsFkY}, ${cx1} ${tutorGroupsPkY}, ${leftX + BOX_WIDTH} ${tutorGroupsPkY}`}
        fill="none"
        stroke="#0066cc"
        strokeWidth="2.5"
        markerEnd="url(#guide-arrow-overview)"
      />
      <path
        d={`M ${rightX} ${gradesFkY} C ${cx4} ${gradesFkY}, ${cx3} ${studentsPkY}, ${midX + BOX_WIDTH} ${studentsPkY}`}
        fill="none"
        stroke="#0066cc"
        strokeWidth="2.5"
        markerEnd="url(#guide-arrow-overview)"
      />
      <TableBox x={leftX} title="tutor_groups" columns={tutorGroupsColumns} keys={[{ index: 0, label: 'PK' }]} accent="#28a745" />
      <TableBox
        x={midX}
        title="students"
        columns={studentsColumns}
        keys={[{ index: 0, label: 'PK' }, { index: 3, label: 'FK' }]}
        accent="#0066cc"
      />
      <TableBox x={rightX} title="grades" columns={gradesColumns} keys={[{ index: 0, label: 'FK' }]} accent="#0066cc" />
    </svg>
  );
}

const VENN_R = 42;
const VENN_LEFT_CX = 46;
const VENN_RIGHT_CX = 84;
const VENN_CY = 55;
const VENN_WIDTH = 130;
const VENN_HEIGHT = 110;

/** One small two-circle Venn diagram showing which rows a single JOIN type keeps. */
function JoinTypeVenn({ type, leftLabel, rightLabel }) {
  const clipId = `venn-clip-${type}`;
  const includesLeft = type === 'LEFT' || type === 'FULL';
  const includesRight = type === 'RIGHT' || type === 'FULL';
  const includesIntersectionOnly = type === 'INNER';

  return (
    <div className="join-venn">
      <svg viewBox={`0 0 ${VENN_WIDTH} ${VENN_HEIGHT}`} role="img" aria-label={`${type} JOIN keeps: ${type === 'INNER' ? 'matching rows only' : type === 'FULL' ? 'all rows from both tables' : `all rows from the ${type === 'LEFT' ? 'left' : 'right'} table`}`}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={VENN_LEFT_CX} cy={VENN_CY} r={VENN_R} />
          </clipPath>
        </defs>

        {includesLeft && <circle cx={VENN_LEFT_CX} cy={VENN_CY} r={VENN_R} fill="#0066cc" fillOpacity="0.55" />}
        {includesRight && <circle cx={VENN_RIGHT_CX} cy={VENN_CY} r={VENN_R} fill="#28a745" fillOpacity="0.55" />}
        {includesIntersectionOnly && (
          <circle cx={VENN_RIGHT_CX} cy={VENN_CY} r={VENN_R} fill="#6f42c1" clipPath={`url(#${clipId})`} />
        )}

        <circle cx={VENN_LEFT_CX} cy={VENN_CY} r={VENN_R} fill="none" stroke="#0066cc" strokeWidth="2" />
        <circle cx={VENN_RIGHT_CX} cy={VENN_CY} r={VENN_R} fill="none" stroke="#28a745" strokeWidth="2" />

        <text x={VENN_LEFT_CX - 20} y={VENN_CY + 3} fontSize="11" fontWeight="700" fill="#0052a3" textAnchor="middle">{leftLabel}</text>
        <text x={VENN_RIGHT_CX + 20} y={VENN_CY + 3} fontSize="11" fontWeight="700" fill="#1e7e34" textAnchor="middle">{rightLabel}</text>
      </svg>
      <p className="join-venn-label">{type} JOIN</p>
    </div>
  );
}

/** All four JOIN types side by side, so a student can compare which rows each one keeps. */
export function JoinTypeComparison({ leftLabel = 'emp', rightLabel = 'dept' }) {
  return (
    <div className="join-venn-row">
      <JoinTypeVenn type="INNER" leftLabel={leftLabel} rightLabel={rightLabel} />
      <JoinTypeVenn type="LEFT" leftLabel={leftLabel} rightLabel={rightLabel} />
      <JoinTypeVenn type="RIGHT" leftLabel={leftLabel} rightLabel={rightLabel} />
      <JoinTypeVenn type="FULL" leftLabel={leftLabel} rightLabel={rightLabel} />
    </div>
  );
}
