import { citeRecord, redact, type Answer, type QeRecord } from "./assistant";
import type { Fragment } from "./attachments";

export type IndexedAttachment = { record: QeRecord; fragment: Fragment; name: string };
const noEvidence = (text = "未找到可引用依据。可以补充物料料号、业务编号或问题描述。"): Answer => ({
  kind: "knowledge", title: "检索结果", sections: [{ label: "依据不足", text, sources: [] }],
});

export const restrictedRequest = (question: string) =>
  /(?:忽略|绕过|解除|跳过).{0,12}(?:权限|规则|限制|指令)|(?:导出|列出|泄露|发给).{0,16}(?:(?:全部|所有).{0,8}(?:供应商|客户|组织权限)|敏感|密码|密钥)|(?:系统提示词|原始权限|自动审核|自动驳回|自动关单|生成审核意见|生成驳回原因|帮我.{0,6}(?:通过|驳回|关单))|(?:ignore|bypass).{0,24}(?:instructions|permissions|rules)/i.test(question);

export function unsupportedQuestion(question: string): Answer {
  return noEvidence(restrictedRequest(question)
    ? "此请求超出助手可执行的范围。可查询当前权限内的单据、历史案例和指标。"
    : undefined);
}

export function isEffective(record: QeRecord): boolean {
  if (record.label === "基础数据") return record.status === "enabled";
  if (["物料异常", "售后异常"].includes(record.label)) return record.status === "approved";
  if (record.label === "零星退料记录") return record.status === "completed";
  return ["approved", "completed"].includes(record.status);
}

const directFields: Array<[RegExp, RegExp]> = [
  [/抽检|检验数量|检了多少/, /检验数量|抽检数量/],
  [/不良数量|不良数|多少件不良|不合格.*多少|多少.*不合格|冲突|一致/, /不良数量/],
  [/投入|来料数量|进料数量/, /投入数量|来料数量/],
  [/状态|结果|结论|合格吗|是否合格/, /当前状态|检验结果|入库合格类型/],
  [/处理|处置|驳回|审核意见|为什么/, /处理方式|审核意见|流转|8D备注/],
  [/根因|原因|措施|改善|8d/i, /8D备注|维修明细|改善措施|异常描述/i],
  [/缺陷|不良|问题描述/, /不良现象|异常描述|缺陷明细/],
  [/出货数量|出货多少/, /出货数量/],
  [/退料数量|退了多少/, /退料数量/],
  [/入库数量|入库多少/, /入库数量/],
  [/物料数量|单机用量|物料用量/, /物料数量/],
  [/订单数量|订单数/, /订单数量/],
  [/供应商/, /供应商/],
  [/来源日报|来源单据|来源/, /来源/],
  [/责任部门|谁负责/, /责任部门/],
  [/进度|纠正|闭环/, /处理进度|当前状态/],
  [/试产|生产总结/, /试产信息/],
  [/良率|不良率/, /不良数量|投入数量|检验数量/],
  [/备注|说明/, /备注|说明/],
  [/型号/, /型号/],
];

function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function textTokens(text: string): string[] {
  const words = text.normalize("NFKC").toLowerCase().match(/[\p{Script=Han}]+|[a-z0-9]+(?:[_.-][a-z0-9]+)*/gu) ?? [];
  return [...new Set(words.flatMap((part) => {
    if (!/^\p{Script=Han}+$/u.test(part)) return part.length > 1 ? [part] : [];
    return [...part].slice(0, -1).map((char, i) => char + part[i + 1]);
  }))].filter((word) => !/^(?:这个|那个|这些|当前|以前|历史|最近|什么|多少|没有|有没有|可以|请问|案例|类似|还有|哪些|怎么|如何|帮我|请帮|查看|一下|查找|单据|这张|依据)$/.test(word));
}

export function knowledgeAnswer(
  question: string, records: QeRecord[], context: QeRecord | undefined, attachments: IndexedAttachment[],
  options: { previous?: Answer; partialAttachments?: boolean; mode?: "detail" | "history" | "8d" | "rules" } = {},
): Answer {
  if (restrictedRequest(question)) return unsupportedQuestion(question);
  const previous = options.previous?.kind === "knowledge" ? options.previous : undefined;
  const more = /^(?:还有|再找|再查|更多|其他案例)/.test(question);
  const why = /^(?:为什么[？?]?|依据(?:呢|是什么)?[？?]?)$/.test(question);
  const topic = (more || why) && previous?.topic ? previous.topic : question;
  const q = normalize(topic);
  const historical = options.mode === "history" || options.mode === "8d" || (!options.mode && (more || /类似|相似|历史|以前|过去|先例|同类|一般|通常/.test(topic)));
  const tokens = textTokens(topic);
  const fieldsWanted = directFields.filter(([trigger]) => trigger.test(q)).map(([, pattern]) => pattern);
  const asksForStandard = options.mode === "rules" || (!options.mode && /标准|SIP|质量协议|抽样方案|判定规则|缺陷定义/i.test(q));
  const wants8d = options.mode === "8d" || (!options.mode && /8d|根因|改善措施/i.test(q));
  const explicitCodes = topic.normalize("NFKC").toLowerCase().match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)+|[a-z]{2,}\d{5,}/g) ?? [];
  const namedRecords = (options.mode === "detail" && context ? [context] : records).filter((record) => record.label !== "基础数据" && record.no.length >= 5 && q.includes(normalize(record.no)));
  const unknownCodes = explicitCodes.filter((code) => !records.some((record) =>
    [record.no, record.material, ...record.fields.map(({ value }) => String(value)), ...attachments.filter((item) => item.record.key === record.key).map(({ name }) => name)]
      .some((value) => value && normalize(value).includes(code)) &&
    (!namedRecords.length || namedRecords.includes(record))));
  if (unknownCodes.length && (!historical || !context || unknownCodes.some((code) => code !== normalize(context.no)))) return noEvidence();
  if (options.mode === "detail" && !context && !namedRecords.length) return noEvidence();

  const matchingEntity = records.filter((record) =>
    [record.material, record.supplier, ...record.fields.filter(({ label }) => /^(产品名称|产品型号|物料名称)$/.test(label)).map(({ value }) => String(value))]
      .some((term) => term && term.length >= 3 && q.includes(normalize(term))));
  const anchored = (options.mode === "detail" ? context : undefined) ?? namedRecords[0] ?? ((why || more) && previous?.caseKeys?.length ? records.find((record) => record.key === previous.caseKeys![0]) : undefined)
    ?? (matchingEntity.length ? undefined : context);
  const contextKey = anchored?.key;
  const latest = /最近一次|最近一批|最新一/.test(q);
  const domain = ([
    [/单机用量|物料用量|产品数据|基础数据/, "基础数据"], [/来料检验|来料不合格/, "来料检验"], [/出货报告/, "出货报告"], [/售后异常/, "售后异常"],
    [/物料异常/, "物料异常"], [/生产检验日报|生产日报/, "生产检验日报"], [/维修记录/, "维修记录"],
    [/巡线|ipqc/i, "IPQC巡线问题记录"], [/零星退料/, "零星退料记录"], [/入库报告/, "入库报告"], [/试产/, "试产及生产总结"],
  ] as const).find(([pattern]) => pattern.test(q))?.[1];
  const excluded = new Set(more ? previous?.caseKeys : []);
  const rows = records.flatMap((record) => {
    if (options.mode === "detail" && record.key !== anchored?.key) return [];
    if (historical && !isEffective(record)) return [];
    if (options.mode === "history" && domain && record.label !== domain) return [];
    const sameMaterial = Boolean(anchored?.material && record.material === anchored.material);
    const sameSupplier = Boolean(anchored?.supplier && record.supplier === anchored.supplier);
    const exact = namedRecords.includes(record);
    const isIncomingPrecedent = historical && /来料.*(?:不合格|处理)/.test(q);
    const unqualified = record.fields.some(({ label, value }) => label === "检验结果" && value === "不合格");
    if (isIncomingPrecedent && (record.label !== "来料检验" || (/不合格/.test(q) && !unqualified))) return [];
    if (excluded.has(record.key) || (historical && record.key === contextKey) || (namedRecords.length && !historical && !exact) ||
      (matchingEntity.length > 0 && !namedRecords.length && !matchingEntity.includes(record))) return [];
    const extraFields = attachments.filter((item) => item.record.key === record.key)
      .map(({ name, fragment }) => ({ label: `${name} / ${fragment.location}`, value: fragment.text, attachment: true }));
    const fields = [...record.fields, ...record.history, ...extraFields]
      .map((field) => {
        const raw = String(field.value);
        const value = normalize(raw);
        const label = normalize(field.label);
        const rank = tokens.reduce((sum, token) => sum + (value.includes(token) || label.includes(token) ? 1 : 0), 0);
        const requested = fieldsWanted.some((wanted) => wanted.test(field.label));
        return { ...field, raw, rank, requested, score: rank + (requested ? 5 : 0) };
      })
      .filter(({ raw }) => raw.trim())
      .filter((field) => !asksForStandard || ("attachment" in field && /标准|检验规范|抽样|SIP|质量协议/i.test(field.raw + field.label)))
      .sort((a, b) => b.score - a.score);
    const matching = fields.filter(({ rank, requested, raw }) =>
      rank >= 2 || requested || tokens.some((token) => /^[a-z0-9.-]{5,}$/.test(token) && normalize(raw).includes(token)));
    const matchedWords = tokens.filter((token) => normalize(record.label).includes(token) || fields.some(({ label, raw }) =>
      normalize(label + raw).includes(token))).length;
    const quality = (matchedWords >= 2 || (asksForStandard && matchedWords >= 1)) && matchedWords / Math.max(1, tokens.length) >= 0.28;
    const scopeMatch = Boolean(exact || matchingEntity.includes(record) || record.key === contextKey || (historical && (sameMaterial || sameSupplier)));
    if ((!scopeMatch && !quality) || (historical && anchored && !sameMaterial && !sameSupplier && !exact && !quality) ||
      (asksForStandard && !matching.length && !fields.length)) return [];
    if (!scopeMatch && !asksForStandard && /来料/.test(q) && record.label !== "来料检验") return [];
    if (!scopeMatch && !historical && fieldsWanted.length && !matching.length) return [];
    const evidence8d = fields.filter(({ label, raw }) => /8D备注|根因|纠正措施|改善措施|永久措施|D4|D5/i.test(label + raw));
    if (wants8d && !evidence8d.length) return [];
    if (options.mode !== "detail" && !historical && !asksForStandard && !wants8d && !matching.length && !/详情|概况|基本信息|查找|查看/.test(q)) return [];
    const relevant = wants8d ? evidence8d.concat(fields.filter(({ label }) => /审核意见|流转记录.*(?:通过|关闭)/.test(label))) : asksForStandard ? fields : matching.length ? matching : fields.filter(({ label }) =>
      /异常描述|处理方式|审核意见|检验结果|当前状态|8D备注|缺陷明细|维修明细|产品名称|试产信息/.test(label));
    const score = (exact ? 80 : 0) + (record.key === contextKey ? 60 : 0) + (matchingEntity.includes(record) ? 38 : 0) +
      (sameMaterial ? 27 : 0) + (sameSupplier ? 18 : 0) + (wants8d && ["物料异常", "售后异常"].includes(record.label) ? 10 : 0) +
      (isIncomingPrecedent && record.fields.some(({ label }) => label === "处理方式") ? 20 : 0) + matchedWords * 2;
    return [{ record, relevant, score, linked: sameMaterial && sameSupplier ? "同物料、同供应商" : sameMaterial ? "同物料" : sameSupplier ? "同供应商" : undefined }];
  }).sort((a, b) => (latest ? b.record.date.localeCompare(a.record.date) : 0) || b.score - a.score || b.record.date.localeCompare(a.record.date) || a.record.key.localeCompare(b.record.key));

  const chosen = rows.slice(0, latest ? 1 : historical || !contextKey ? 4 : 1);
  if (!chosen.length) {
    return noEvidence(options.partialAttachments
      ? "未找到可引用依据。部分原附件未能提取，仍可在原业务页核对。"
      : asksForStandard ? "未找到可引用的检验标准或判定规则。可补充标准名称或原单据编号。" : wants8d ? "未找到可引用的历史 8D 根因或措施。" : undefined);
  }
  const statuses = new Set(chosen.map(({ record }) => record.statusLabel));
  const sections = chosen.map(({ record, relevant, linked }) => {
    const sources = relevant.slice(0, 4).map(({ label, raw }) => {
      const safe = citeRecord(record, label, raw);
      safe.excerpt = safe.excerpt.length > 420 ? safe.excerpt.slice(0, 420) + "…" : safe.excerpt;
      return safe;
    });
    const state = citeRecord(record, "当前状态", record.statusLabel, record.updatedAt);
    if (!sources.some((source) => source.location === state.location)) sources.push(state);
    return {
      label: historical ? "历史案例" : "事实",
      text: `${record.no} · ${record.statusLabel}${linked && historical ? ` · ${linked}` : ""}${options.mode === "detail" && relevant[0]?.requested && sources[0] ? `\n${sources[0].location}：${sources[0].excerpt}` : ""}`,
      sources,
    };
  });
  const note = [
    asksForStandard && chosen.length > 1 && new Set(chosen.flatMap(({ relevant }) => relevant.map(({ raw }) => raw))).size > 1
      ? "检索到多份规则，请按版本、适用范围核对差异。" : undefined,
    historical && statuses.size > 1 ? "历史案例的处理状态有差异，请结合各单据对应的检验与审核记录核对。" : undefined,
    asksForStandard ? "引用来自平台内业务附件，请核对标准版本与生效范围。" : undefined,
    options.partialAttachments ? "部分附件仅有文件名、格式暂不支持或提取超时，可点原单据核对。" : undefined,
  ].filter(Boolean).join(" ");
  return {
    kind: "knowledge", title: historical ? "相似案例与处理记录" : why ? "引用与依据" : "检索结果", sections, note,
    caseKeys: [...excluded, ...chosen.map(({ record }) => record.key)], topic: redact(topic),
  };
}
