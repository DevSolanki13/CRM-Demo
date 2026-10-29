import { prisma } from '../../backend/prisma.js';

// Test-only teardown: callers must pass IDs created by their own test, never live records.
export async function cleanupTestRecords({ leadIds = [], dealIds = [], activityIds = [] }, client = prisma) {
  const leads = [...new Set(leadIds.filter(Boolean))];
  const requestedDeals = [...new Set(dealIds.filter(Boolean))];
  const activities = [...new Set(activityIds.filter(Boolean))];
  if (!leads.length && !requestedDeals.length && !activities.length) return {};
  const removeFixtures = async tx => {
    const deals = new Set(requestedDeals);
    const linkedDeals = await tx.deal.findMany({ where: { leadId: { in: leads } }, select: { id: true } });
    linkedDeals.forEach(record => deals.add(record.id));
    let parents = [...deals];
    const generations = [];
    while (parents.length) {
      generations.push(parents);
      const children = await tx.deal.findMany({ where: { parentDealId: { in: parents } }, select: { id: true } });
      parents = children.map(record => record.id).filter(id => !deals.has(id));
      parents.forEach(id => deals.add(id));
    }
    const dealList = [...deals];
    const linked = [{ linkedType: 'Lead', linkedId: { in: leads } }, { linkedType: 'Deal', linkedId: { in: dealList } }];
    const records = [{ recordType: 'Lead', recordId: { in: leads } }, { recordType: 'Deal', recordId: { in: dealList } }];
    if (await tx.attachment.count({ where: { OR: records } })) {
      throw new Error('Test cleanup found attached files. Clean up their storage explicitly before removing the test records.');
    }
    const recordIds = [...leads, ...dealList];
    const eventFilter = recordIds.flatMap(id => ['id', 'leadId', 'dealId'].map(field => ({ context: { path: [field], equals: id } })));
    if (eventFilter.length && await tx.automationEvent.count({ where: { OR: eventFilter, status: 'running', lockedUntil: { gt: new Date() } } })) {
      throw new Error('Test automation is still running; cleanup cannot remove its records yet.');
    }
    if (eventFilter.length) await tx.automationEvent.deleteMany({ where: { OR: eventFilter } });
    const checks = await tx.stageGateCheck.findMany({ where: { dealId: { in: dealList } }, select: { id: true } });
    const tasks = await tx.task.findMany({ where: { OR: [...linked, { stageGateCheckId: { in: checks.map(check => check.id) } }] }, select: { id: true } });
    const taskIds = tasks.map(task => task.id);
    await tx.orphanReference.deleteMany({ where: { OR: [...records, { recordType: 'Task', recordId: { in: taskIds } }] } });
    const taskCount = await tx.task.deleteMany({ where: { id: { in: taskIds } } });
    await tx.note.deleteMany({ where: { OR: linked } });
    await tx.activity.deleteMany({ where: { OR: [...linked, { id: { in: activities } }] } });
    await tx.stageGateCheck.deleteMany({ where: { id: { in: checks.map(check => check.id) } } });
    await tx.auditLog.deleteMany({ where: { OR: [
      { entityType: 'Lead', entityId: { in: leads } }, { entityType: 'Deal', entityId: { in: dealList } },
      { entityType: 'Task', entityId: { in: taskIds } }, { entityType: 'Activity', entityId: { in: activities } },
    ] } });
    for (const generation of generations.reverse()) await tx.deal.deleteMany({ where: { id: { in: generation } } });
    const leadCount = await tx.lead.deleteMany({ where: { id: { in: leads } } });
    return { leads: leadCount.count, deals: dealList.length, tasks: taskCount.count };
  };
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.$transaction(removeFixtures, { isolationLevel: 'Serializable', timeout: 20000 });
    } catch (error) {
      if (error.code !== 'P2034' || attempt >= 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 50 * 2 ** attempt));
    }
  }
}
