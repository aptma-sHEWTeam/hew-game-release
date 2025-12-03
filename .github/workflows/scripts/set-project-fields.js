module.exports = async function run({ core, github, process }) {
  if (!process.env.ITEM_ID || !process.env.PROJECT_ID) {
    console.log('[Diag] item_id/project_id 未取得。前段の Get Project Data を確認');
    console.log('[Diag] ITEM_ID=', process.env.ITEM_ID);
    console.log('[Diag] PROJECT_ID=', process.env.PROJECT_ID);
    return;
  }
  if (!process.env.FIELDS || !process.env.FIELD_OPTIONS) {
    console.log('[Diag] FIELDS or FIELD_OPTIONS 未取得');
    console.log('[Diag] FIELDS=', process.env.FIELDS);
    console.log('[Diag] FIELD_OPTIONS=', process.env.FIELD_OPTIONS);
    return;
  }

  const projectId = process.env.PROJECT_ID;
  const itemId = process.env.ITEM_ID;

  function safeParse(name, raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      core.setFailed(`[ParseError] ${name} を JSON として解釈できません: ${e.message}. raw=${raw}`);
      return null;
    }
  }

  const fields = safeParse('FIELDS', process.env.FIELDS);
  const fieldOptions = safeParse('FIELD_OPTIONS', process.env.FIELD_OPTIONS);
  if (!fields || !fieldOptions) return;
  console.log('FIELDS JSON:', JSON.stringify(fields, null, 2));
  console.log('FIELD_OPTIONS JSON:', JSON.stringify(fieldOptions, null, 2));

  const SKIP = new Set(['', '_No response_', 'No response', 'Choose an option', 'None', 'No date', 'Enter number...']);

  const fieldIdByName = new Map(Object.entries(fields).map(([k, v]) => [k.trim().toLowerCase(), v]));
  const optionIdByFieldName = new Map(
    Object.entries(fieldOptions).map(([fname, opts]) => [
      fname.trim().toLowerCase(),
      new Map(Object.entries(opts || {}).map(([n, id]) => [n.trim().toLowerCase(), id])),
    ]),
  );

  function getFieldId(fieldName) {
    const id = fieldIdByName.get(fieldName.trim().toLowerCase());
    if (!id) console.log(`Field not found: ${fieldName}`);
    return id;
  }

  function getOptionId(fieldName, value) {
    const opts = optionIdByFieldName.get(fieldName.trim().toLowerCase());
    if (!opts) {
      console.log(`Options not found for ${fieldName}`);
      return null;
    }
    const id = opts.get(value.trim().toLowerCase());
    if (!id) console.log(`Option not found: ${fieldName} -> ${value}. Available=`, Array.from(opts.keys()));
    return id;
  }

  // 入力値→プロジェクト側表示名へのマッピング
  function mapValue(fieldName, value) {
    const v = (value || '').trim();
    const lc = v.toLowerCase();
    const maps = {
      role: {
        planner: 'プランナー',
        programmer: 'プログラマー',
        designer: 'デザイナー',
        qa: 'Q＆A',
        'q&a': 'Q＆A',
        'q＆a': 'Q＆A',
      },
      priority: {
        0: 'P10',
        1: 'P9',
        2: 'P8',
        3: 'P7',
        4: 'P6',
        5: 'P5',
        6: 'P4',
        7: 'P3',
        8: 'P2',
        9: 'P1',
        10: 'P0',
      },
      component: {
        level: 'Stage',
        stages: 'Stage',
        stage: 'Stage',
      },
      size: {
        xs: 'Low',
        s: 'Low',
        small: 'Low',
        low: 'Low',
        m: 'Mid',
        mid: 'Mid',
        medium: 'Mid',
        l: 'High',
        xl: 'High',
        high: 'High',
      },
      programteam: {
        a: 'A',
        b: 'B',
        c: 'C',
      },
    };
    const key = fieldName.trim().toLowerCase();
    if (maps[key] && maps[key][lc]) return maps[key][lc];
    return v; // マッピング不要ならそのまま
  }

  let intended = 0;
  let changed = 0;

  async function setSingleSelect(fieldName, rawValue) {
    if (SKIP.has(rawValue)) {
      console.log(`Skip ${fieldName}: '${rawValue}'`);
      return;
    }
    const value = mapValue(fieldName, rawValue);
    intended++;
    const fieldId = getFieldId(fieldName);
    if (!fieldId) return;
    const optId = getOptionId(fieldName, value);
    if (!optId) return;
    await github.graphql(
      `mutation { updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${fieldId}", value: { singleSelectOptionId: "${optId}" } }) { projectV2Item { id } } }`,
    );
    changed++;
    console.log(`→ Set ${fieldName}: ${value}`);
  }

  async function setDate(fieldName, value) {
    if (SKIP.has(value)) {
      console.log(`Skip ${fieldName}: '${value}'`);
      return;
    }
    intended++;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      console.log(`Skip ${fieldName}: invalid date '${value}'`);
      return;
    }
    const fieldId = getFieldId(fieldName);
    if (!fieldId) return;
    await github.graphql(
      `mutation { updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${fieldId}", value: { date: "${value}" } }) { projectV2Item { id } } }`,
    );
    changed++;
    console.log(`→ Set ${fieldName}: ${value}`);
  }

  async function setNumber(fieldName, value) {
    if (SKIP.has(value)) {
      console.log(`Skip ${fieldName}: '${value}'`);
      return;
    }
    intended++;
    const n = parseFloat(value);
    if (Number.isNaN(n)) {
      console.log(`Skip ${fieldName}: NaN '${value}'`);
      return;
    }
    const fieldId = getFieldId(fieldName);
    if (!fieldId) return;
    await github.graphql(
      `mutation { updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${fieldId}", value: { number: ${n} } }) { projectV2Item { id } } }`,
    );
    changed++;
    console.log(`→ Set ${fieldName}: ${n}`);
  }

  await setSingleSelect('Role', process.env.ROLE);
  await setSingleSelect('ProgramTeam', process.env.TEAM);
  await setSingleSelect('Priority', process.env.PRIORITY);
  await setSingleSelect('Component', process.env.COMPONENT);
  await setSingleSelect('Size', process.env.SIZE);
  await setNumber('Estimate', process.env.ESTIMATE);
  await setDate('Start date', process.env.START_DATE);
  await setDate('End date', process.env.DUE_DATE);

  console.log(`Summary: intended=${intended}, changed=${changed}`);
  if (intended > 0 && changed === 0) {
    console.log('No fields were updated. Check field names/options and token scopes.');
  }
};
