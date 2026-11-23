import demoAttachments from "./demo-assets/attachments.json";
import { dayInShanghai, shiftDay } from "./assistant";

type DemoOrganizations = {
  factoryId: string;
  factoryName: string;
  supplierId: string;
  platformName: string;
  platformId: string;
};

const connector = {
  materialNo: "MAT-QE-DEMO-01",
  materialName: "USB-C 连接器（模拟）",
  model: "QC-24",
};
const supplierName = "连接器供应商（模拟）";
const defect = "端子压接高度超差";
const demoRemark = "QE 助手模拟资料，供本地演示。";

function localTime(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai", dateStyle: "short", timeStyle: "short", hourCycle: "h23",
  }).format(date);
}

function textAttachment(text: string) {
  const bytes = new TextEncoder().encode(text);
  return `data:text/plain;base64,${btoa(String.fromCharCode(...bytes))}`;
}

export function makeQeDemoFixtures(organizations: DemoOrganizations, now = new Date()) {
  const { factoryId, factoryName, supplierId, platformName } = organizations;
  const today = dayInShanghai(now);
  const lastWeek = shiftDay(today, -7);
  const yesterday = shiftDay(today, -1);
  const priorDay = shiftDay(today, -2);
  const overdueAt = localTime(new Date(now.valueOf() - 51 * 3_600_000));
  const dueSoonAt = localTime(new Date(now.valueOf() - 40 * 3_600_000));
  const historyDate = shiftDay(today, -12);
  const historyAt = `${historyDate} 14:30`;
  const flow = (id: string, time: string, action: string, kind: "submitted" | "review_approved" | "review_rejected" | "submitted_8d" | "assigned" | "cancelled", detail?: string) => ({
    id: `${id}-${kind}`, time, action, kind, operator: "模拟质检员", organization: factoryName, detail,
  });

  function inspection(date: string, sequence: string, defectQty: number, pending = false, time = `${date} 10:00`) {
    const id = `qe-demo-iqc-${sequence}`;
    const handlingMethod = defectQty ? "隔离该批并退回供应商；复验另行记录。" : "检验合格，正常入库。";
    return {
      ...connector, id, version: 1, businessNo: `IQC-DEMO-${sequence}`,
      status: pending ? "pending_review" as const : "completed" as const, factoryOrganizationId: factoryId,
      factoryOrganization: factoryName, supplierName, inspectionDate: date, inputQty: 600, inspectionQty: 120,
      defectQty, inspectionResult: defectQty ? "unqualified" as const : "qualified" as const,
      supplyMethod: "platform_purchase" as const, attachmentName: "", remark: demoRemark,
      defectDescription: defectQty ? defect : "", handlingMethod: pending ? undefined : handlingMethod,
      flowRecords: [
        flow(id, time, "工厂提交模拟来料检验", "submitted"),
        ...(pending ? [] : [flow(id, time, "平台复核模拟来料检验", "review_approved", handlingMethod)]),
      ],
      createdAt: time, updatedAt: time,
    };
  }
  const incoming = [
    inspection(lastWeek, "01", 0), inspection(lastWeek, "02", 0),
    inspection(priorDay, "03", 0), inspection(priorDay, "04", 0),
    inspection(yesterday, "05", 0), inspection(yesterday, "06", 7),
    inspection(today, "07", 0, false, localTime(now)), inspection(today, "08", 9, false, localTime(now)),
    inspection(dueSoonAt.slice(0, 10), "09", 5, true, dueSoonAt),
  ];

  function production(date: string, sequence: string, defectQty: number, time = `${date} 15:00`) {
    const id = `qe-demo-pir-${sequence}`;
    return {
      id, version: 1, businessNo: `PIR-DEMO-${sequence}`, businessType: "production_inspection" as const,
      status: "completed" as const, factoryOrganizationId: factoryId, factoryOrganization: factoryName,
      businessDate: date, materialNo: connector.materialNo, productName: connector.materialName, productModel: connector.model,
      orderNo: "PO-QE-DEMO-01", orderQty: 2400, inputQty: 500, inspectionQty: 500, defectQty, inspectionProcess: "一检",
      defectDetails: [{ id: `${id}-defect`, defect, quantity: defectQty }],
      attachmentName: "", remark: demoRemark, flowRecords: [flow(id, time, "工厂提交模拟生产日报", "submitted")],
      createdAt: time, updatedAt: time,
    };
  }
  const direct = [
    production(lastWeek, "01", 8), production(priorDay, "02", 10),
    production(yesterday, "03", 45), production(today, "04", 50, localTime(now)),
  ];

  const materialBase = {
    ...connector, version: 1, reporterOrganizationId: factoryId, reporterOrganization: factoryName,
    supplierOrganizationId: supplierId, supplierName, inputQty: 600, inspectionQty: 120, attachmentName: "", remark: demoRemark,
  };
  const rootCause = "根因：换线后治具限位块未锁紧，端子压接位置偏移。";
  const actions = "纠正措施：增加限位块复核步骤，首件复验合格后恢复生产。";
  const material = [
    {
      ...materialBase, id: "qe-demo-me-01", businessNo: "ME-DEMO-01", status: "pending_review" as const,
      businessDate: overdueAt.slice(0, 10), defectQty: 7, description: `抽检 120 件，7 件${defect}。现场照片待补。`,
      flowRecords: [flow("qe-demo-me-01", overdueAt, "工厂提报模拟物料异常", "submitted")],
      createdAt: overdueAt, updatedAt: overdueAt,
    },
    {
      ...materialBase, id: "qe-demo-me-02", businessNo: "ME-DEMO-02", status: "approved" as const,
      businessDate: historyDate, defectQty: 6, description: `同一物料批次出现${defect}，隔离后开展 8D 调查。`,
      eightDRemark: "复验结果：连续 3 批均未再出现压接高度超差。",
      eightDAttachmentName: "模拟8D_端子压接改善.txt",
      eightDAttachmentDataUrl: textAttachment(`模拟 8D 报告\nD4 ${rootCause}\nD5 ${actions}\nD6 连续 3 批抽检合格。`),
      reviewReason: "按历史工单记录，验证结果符合关闭要求。",
      flowRecords: [
        flow("qe-demo-me-02", `${historyDate} 08:20`, "工厂提报模拟异常", "submitted"),
        flow("qe-demo-me-02", `${historyDate} 11:00`, "提交模拟 8D 报告", "submitted_8d"),
        { ...flow("qe-demo-me-02", historyAt, "模拟 8D 审核通过", "review_approved"), organization: platformName },
      ],
      createdAt: `${historyDate} 08:20`, updatedAt: historyAt,
    },
  ];

  const afterSales = [{
    ...connector, id: "qe-demo-sa-01", version: 1, businessNo: "SA-DEMO-01", status: "rejected_8d" as const,
    reporterOrganization: platformName, supplierOrganizationId: supplierId, supplierName, businessDate: today,
    inputQty: 1000, defectQty: 3, returnQty: 3, description: "连接器间歇断连，8D 中缺少改善后的复验记录。",
    attachmentName: "", remark: demoRemark, reviewReason: "请补充更新后的复验记录。",
    flowRecords: [{ ...flow("qe-demo-sa-01", localTime(now), "模拟 8D 已驳回", "review_rejected"), organization: platformName }],
    createdAt: localTime(now), updatedAt: localTime(now),
  }];

  const catalog = [
    { materialNo: "MAT-001", materialName: "电源模块", model: "PM-42", defect: "焊点虚焊" },
    { materialNo: "MAT-017", materialName: "连接器总成", model: "CN-17", defect: "端子接触不良" },
    { materialNo: "MAT-023", materialName: "结构件", model: "SH-23", defect: "尺寸超差" },
    { materialNo: "MAT-009", materialName: "显示模组", model: "DS-09", defect: "屏幕显示异常" },
  ];
  const factories = [
    { id: factoryId, name: factoryName, code: "A" },
    { id: "qe-demo-factory-b", name: "华东精工 OEM 工厂（模拟）", code: "B" },
  ];
  const suppliers = ["华南电子器件（模拟）", "江北精密器件（模拟）", "蓝湾结构件（模拟）", "鹏城光电（模拟）"];
  const company = organizations.platformId;
  const dates = [...new Set([
    ...Array.from({ length: 30 }, (_, day) => shiftDay("2026-09-01", day)),
    ...Array.from({ length: 31 }, (_, day) => shiftDay("2026-08-01", day)),
    ...Array.from({ length: 35 }, (_, day) => shiftDay(today, -day)),
  ])].filter((date) => date <= today).sort();
  const keyDate = (date: string) => date.replaceAll("-", "");
  const batchFlow = (id: string, time: string, name: string, valid = true) => [
    flow(id, time, `模拟${name}提交`, "submitted"),
    ...(valid ? [flow(id, time, `模拟${name}审核通过`, "review_approved")] : []),
  ];
  const inspectionRows = dates.flatMap((date) => factories.map((factory, index) => {
    const day = Number(date.slice(-2));
    const item = catalog[(day + index) % catalog.length];
    const isBad = (date === "2026-08-20" && index === 0) || (day + index) % (date.slice(0, 7) === "2026-09" ? 5 : 9) < 1;
    const row = inspection(date, `${keyDate(date)}-${factory.code}`, isBad ? 4 + day % 10 : 0, false, date === today ? localTime(now) : `${date} 09:00`);
    return { ...row, ...item, supplierName: suppliers[catalog.indexOf(item)], factoryOrganizationId: factory.id, factoryOrganization: factory.name,
      supplyMethod: (index === 1 ? "factory_purchase" : "platform_purchase") as "factory_purchase" | "platform_purchase",
      defectDescription: isBad ? item.defect : "", remark: "模拟来料检验 · 批次隔离与复验记录",
      handlingMethod: isBad ? "隔离并标识不良批，按关联物料异常单进入复验。" : "来料检验合格。" };
  }));

  const productionRows = dates.flatMap((date) => factories.flatMap((factory, index) => {
    const day = Number(date.slice(-2));
    const item = catalog[(day + index) % catalog.length];
    return (["一检", "二检"] as const).map((process, processIndex) => {
      const bad = (date.slice(0, 7) === "2026-09" ? 14 : 5) + (index + 1) * (day % 4) - processIndex * 4;
      const row = production(date, `${keyDate(date)}-${factory.code}-${processIndex + 1}`, bad, date === today ? localTime(now) : `${date} 14:00`);
      return { ...row, materialNo: item.materialNo, productName: item.materialName, productModel: item.model,
        factoryOrganizationId: factory.id, factoryOrganization: factory.name,
        orderNo: `PO-QE-${keyDate(date)}-${factory.code}`, orderQty: 500, inspectionProcess: process,
        defectDetails: [{ id: `${row.id}-defect`, defect: item.defect, quantity: bad }],
      };
    });
  }));
  const getProduct = (row: typeof productionRows[number]) => catalog.find((item) => item.materialNo === row.materialNo)!;
  const factoryById = (id: string) => factories.find((item) => item.id === id)!;
  const first = productionRows.filter((row) => row.inspectionProcess === "一检");
  const repairs = first.filter((row) => Number(row.businessDate.slice(-2)) % 4 === 0).map((row) => ({
    ...row, id: row.id.replace("-pir-", "-mr-"), businessNo: row.businessNo.replace("PIR-", "MR-"),
    businessType: "maintenance_record" as const, defectDetails: [],
    flowRecords: [flow(row.id.replace("-pir-", "-mr-"), row.createdAt, "模拟维修记录归档", "submitted")],
    repairDetails: [{ id: `${row.id}-repair`, sourceProductionInspectionId: row.id, sourceProductionInspectionNo: row.businessNo,
      sourceDefectItemId: row.defectDetails[0].id, inspectionProcess: row.inspectionProcess, defect: row.defectDetails[0].defect,
      quantity: Math.min(5, row.defectQty), cause: "首件确认发现治具定位销磨损", method: "更换定位销后复测", repairer: "模拟维修员" }],
  }));
  const ipqc = first.filter((row) => Number(row.businessDate.slice(-2)) % 3 === 0).map((row, index) => {
    const id = row.id.replace("-pir-", "-ipqc-");
    const progress = (["pending", "processing", "completed"] as const)[index % 3];
    return { ...row, id, businessNo: row.businessNo.replace("PIR-", "IPQC-"), businessType: "ipqc_patrol" as const,
      progress, teamLine: "SMT-02线", issueDescription: "换线后首件确认表缺少治具复核签字。",
      issueCategory: ["执行问题", "文件问题", "治具问题"][index % 3], issueLocation: "SMT-02线首站",
      responsibleDepartment: ["生产部", "品质部", "工程部"][index % 3], improvementMeasure: "补签前核对首件样品与设备点检记录。",
      defectDetails: [], flowRecords: [flow(id, row.createdAt, "模拟 IPQC 问题归档", "submitted")],
    };
  });

  const auditedBase = (row: typeof productionRows[number], prefix: string) => {
    const id = row.id.replace("-pir-", `-${prefix.toLowerCase()}-`);
    return { ...row, id, businessNo: row.businessNo.replace("PIR-", `${prefix}-`), materialName: row.productName, materialModel: row.productModel,
      assemblyQty: row.inputQty, qualifiedType: "qualified" as "qualified" | "unqualified", returnReason: "", returnQty: 0,
      inboundQty: 0, trialInfo: "", flowRecords: batchFlow(id, row.createdAt, "业务单据"), remark: demoRemark };
  };
  const inbound = first.filter((row) => Number(row.businessDate.slice(-2)) % 2 === 0).map((row, index) => ({
    ...auditedBase(row, "IR"), businessType: "inbound_report" as const, status: index % 12 === 0 ? "rejected" as const : "approved" as const,
    qualifiedType: index % 12 === 0 ? "unqualified" as const : "qualified" as const,
    inboundQty: index % 5 === 0 ? 500 : 460,
  })).map((row) => row.status !== "rejected" ? row : { ...row, reviewReason: "包装破损，需补充返检。",
    flowRecords: [...batchFlow(row.id, row.createdAt, "入库", false), flow(row.id, row.createdAt, "模拟入库审核驳回", "review_rejected", "包装破损，需补充返检。")] });
  const returns = first.filter((row) => Number(row.businessDate.slice(-2)) % 5 === 0).map((row, index) => ({
    ...auditedBase(row, "RMR"), businessType: "sporadic_return" as const,
    status: (["pending_review", "pending_return", "pending_replenish", "completed", "cancelled"] as const)[index % 5],
    returnReason: "装配后筛出的间歇接触不良，按批次退回。", returnQty: 7 + index % 11,
  })).map((row) => row.status === "pending_review" || row.status === "cancelled" ? { ...row,
    flowRecords: [...batchFlow(row.id, row.createdAt, "退料", false), ...(row.status === "cancelled"
      ? [flow(row.id, row.createdAt, "撤销重复提报", "cancelled")] : [])] } : row);
  const trial = first.filter((row) => Number(row.businessDate.slice(-2)) === 12).map((row) => ({
    ...auditedBase(row, "TPS"), businessType: "trial_summary" as const, status: "approved" as const,
    trialInfo: "模拟小批试产 50 台，功能与装配均已复核，治具定位间隙纳入量产首件确认。",
  }));
  const shipment = first.filter((row) => Number(row.businessDate.slice(-2)) % 8 === 0).map((row) => ({
    ...shipmentFields(row), businessNo: row.businessNo.replace("PIR-", "SR-"), id: row.id.replace("-pir-", "-sr-"),
    shipmentDate: row.businessDate, shipmentQty: 480, orderNo: row.orderNo, orderQty: 500,
    status: "approved" as const, attachmentName: "模拟出货检验记录.txt",
    attachmentDataUrl: textAttachment(`第 1 节 出货检验
外观、标识、功能导通和包装抽样，复核数量 480 件。`),
    flowRecords: batchFlow(row.id, row.createdAt, "出货报告"), remark: demoRemark,
  }));
  function shipmentFields(row: typeof productionRows[number]) {
    const item = getProduct(row);
    return { ...item, version: 1, supplierName: suppliers[catalog.indexOf(item)], supplierOrganizationId: supplierId,
      createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  const materialCases = inspectionRows.filter((row) => row.defectQty > 0).map((row, index) => {
    const no = row.businessNo.replace("IQC-", "ME-");
    const id = row.id.replace("-iqc-", "-me-");
    const status = (["approved", "pending_8d_review", "rejected_8d", "waiting_supplier", "approved", "pending_review", "cancelled"] as const)[index % 7];
    const supplierAssigned = !["pending_review", "cancelled"].includes(status);
    const submitted = supplierAssigned && status !== "waiting_supplier";
    const time = row.createdAt;
    const factory = factoryById(row.factoryOrganizationId);
    return {
      ...materialBase, ...catalog.find((item) => item.materialNo === row.materialNo)!, id, businessNo: no, status, businessDate: row.inspectionDate,
      supplierName: row.supplierName, supplierOrganizationId: supplierAssigned ? supplierId : undefined,
      reporterOrganizationId: index % 6 === 0 ? company : factory.id, reporterOrganization: index % 6 === 0 ? platformName : factory.name,
      sourceIncomingInspectionId: row.id, sourceIncomingInspectionNo: row.businessNo, defectQty: row.defectQty,
      description: `本批抽检 ${row.inspectionQty} 件，发现 ${row.defectQty} 件${row.defectDescription}。`,
      attachmentName: "批次异常复核.txt",
      attachmentDataUrl: textAttachment(`抽样记录
现场复核抽检 ${row.inspectionQty} 件，首次登记不良 ${index % 5 === 0 || no === "ME-DEMO-20260820-A" ? row.defectQty + 1 : row.defectQty} 件。`),
      eightDAttachmentName: submitted ? "供应商整改8D.txt" : undefined,
      eightDAttachmentDataUrl: submitted ? textAttachment(`D4 根因：${row.defectDescription}复现后确认治具定位偏移。
D5 永久措施：更换定位销并增加首件双人确认。
D6 验证：连续 3 批合格。`) : undefined,
      reviewReason: status === "rejected_8d" ? "请补充复验样本与换线记录。" : status === "approved" ? "复核了根因验证及连续 3 批抽检记录。" : undefined,
      flowRecords: [
        flow(id, time, "物料异常提报", "submitted"),
        ...(supplierAssigned ? [flow(id, time, "分配责任供应商", "assigned")] : []),
        ...(submitted ? [flow(id, time, "首次提交 8D", "submitted_8d")] : []),
        ...(status === "approved" ? [flow(id, time, "模拟 8D 审核通过", "review_approved")] : []),
        ...(status === "rejected_8d" ? [flow(id, time, "模拟 8D 审核驳回", "review_rejected")] : []),
        ...(status === "cancelled" ? [flow(id, time, "取消重复提报", "cancelled")] : []),
      ],
      createdAt: time, updatedAt: time,
    };
  });
  const materialByIncoming = new Map(materialCases.map((row) => [row.sourceIncomingInspectionId, row]));
  const linkedInspections = inspectionRows.map((row) => {
    const linked = materialByIncoming.get(row.id);
    return linked && linked.status !== "cancelled" ? { ...row, triggeredMaterialExceptionId: linked.id, triggeredMaterialExceptionNo: linked.businessNo } : row;
  });
  const afterSalesCases = materialCases.filter((_, index) => index % 2 === 0).map((row, index) => ({
    ...row, id: row.id.replace("-me-", "-sa-"), businessNo: row.businessNo.replace("ME-", "AS-"),
    status: (["approved", "pending_supplier", "pending_8d_review", "approved", "rejected_8d"] as const)[index % 5],
    reporterOrganization: platformName, supplierOrganizationId: supplierId, inputQty: 600, returnQty: row.defectQty,
    description: `整机售后反馈：${row.materialName}功能异常，现场记录 ${row.defectQty} 件待复核。`,
  })).map((row) => {
    const time = row.createdAt;
    const submitted = row.status !== "pending_supplier";
    return { ...row,
      eightDAttachmentName: submitted ? "售后改善8D.txt" : undefined,
      eightDAttachmentDataUrl: submitted ? textAttachment(`D4 根因：连接端子在重复插拔后接触不稳定。
D5 措施：调整端子公差，增加插拔寿命检验。`) : undefined,
      flowRecords: [flow(row.id, time, "模拟售后异常提报并分配", "assigned"),
        ...(submitted ? [flow(row.id, time, "首次提交售后 8D", "submitted_8d")] : []),
        ...(row.status === "approved" ? [flow(row.id, time, "售后 8D 审核通过", "review_approved")] : []),
        ...(row.status === "rejected_8d" ? [flow(row.id, time, "售后 8D 审核驳回", "review_rejected", "缺少寿命验证样本记录。")] : [])],
    };
  });
  const rules = [
    { code: "iqc", no: "IQC-DEMO-RULE-01", name: "SIP-QE-IQC-V1.txt",
      text: `SIP-QE-IQC-V1 版本 1.0（演示规则）
第 2 节 来料不合格：隔离和标识该批物料，记录检验数量、不良数量及不良现象。复验结果须独立记录。
第 3 节 端子接触不良：按检验图纸核对端子位置，并使用连续性测试复核间歇断连。` },
    { code: "pqc", no: "IQC-DEMO-RULE-02", name: "SIP-QE-PQC-V1.txt",
      text: `SIP-QE-PQC-V1 版本 1.0（演示规则）
第 2 节 焊点虚焊：核对润湿与焊点外观，依据样板进行显微复检。尺寸超差按图纸公差测量。
第 3 节 缺陷定义：虚焊指机械或电气连接不稳定的焊接缺陷，应记录检验工序与批次。` },
  ].map((rule) => ({
    ...inspection(historyDate, rule.code, 0, false, historyAt), id: `qe-demo-rule-${rule.code}`, businessNo: rule.no,
    attachmentName: rule.name, attachmentDataUrl: textAttachment(rule.text), remark: "模拟 Owner 已确认适用版本，供演示。",
  }));
  const products = factories.flatMap((factory) => catalog.map((item, index) => ({
    id: `qe-demo-product-${factory.code}-${item.materialNo}`, organizationId: factory.id, materialNo: item.materialNo,
    materialType: "product" as const, productName: item.materialName, productModel: item.model, materialQty: index + 2,
    status: "enabled" as const, createdAt: "2026-08-01", updatedAt: "2026-08-01",
  })));

  return {
    incoming: [...incoming.map((row) => row.businessNo === "IQC-DEMO-09"
      ? { ...row, attachmentName: "模拟测量记录.xlsx", attachmentDataUrl: demoAttachments.demoSheet }
      : row.businessNo === "IQC-DEMO-06" ? { ...row, attachmentName: "模拟批次标签.png", attachmentDataUrl: demoAttachments.demoLabel } : row), ...linkedInspections, ...rules],
    direct: [...direct, ...productionRows, ...repairs, ...ipqc],
    material: [...material.map((row) => row.businessNo === "ME-DEMO-02"
      ? { ...row, attachmentName: "模拟8D复核.pdf", attachmentDataUrl: demoAttachments.demoPdf } : row), ...materialCases], afterSales: [...afterSales, ...afterSalesCases],
    audited: [...inbound, ...returns, ...trial], shipment, products,
  };
}
