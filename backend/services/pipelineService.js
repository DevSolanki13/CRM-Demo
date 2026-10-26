import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { validatedInput, pipelineSchema, updatePipelineSchema } from '../middleware/validation.js';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const code = name => name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

export async function listPipelines() {
  return prisma.pipeline.findMany({ orderBy: { name: 'asc' }, include: {
    stages: { orderBy: { order: 'asc' } },
  } });
}

export async function createPipeline(input) {
  input = validatedInput(pipelineSchema, input);
  const name = input?.name?.trim();
  if (!name || name.length > 80) fail('Enter a pipeline name of up to 80 characters.');
  const supplied = input.stages?.length ? input.stages : [
    { name: 'New', category: 'New' },
    { name: 'Closed Won', category: 'Won' },
    { name: 'Closed Lost', category: 'Lost' },
  ];
  if (!Array.isArray(supplied) || supplied.length < 3 || supplied.length > 20 ||
      supplied.some(stage => !stage?.name?.trim() || stage.name.length > 80 ||
        !['New', 'Pipeline', 'Won', 'Lost', 'Buy Again'].includes(stage.category))) {
    fail('Provide 3 to 20 named stages with valid categories.');
  }
  const names = supplied.map(stage => stage.name.trim());
  const codes = names.map(code);
  if (new Set(names.map(value => value.toLowerCase())).size !== names.length ||
      new Set(codes).size !== codes.length || codes.some(value => !value)) {
    fail('Stage names and codes must be unique within a pipeline.');
  }
  if (supplied.filter(stage => stage.category === 'Won').length !== 1 ||
      supplied.filter(stage => stage.category === 'Lost').length !== 1 ||
      supplied.filter(stage => stage.category === 'Buy Again').length > 1 ||
      ['Won', 'Lost', 'Buy Again'].includes(supplied[0].category)) {
    fail('A pipeline needs one Won stage, one Lost stage, and an open first stage.');
  }
  const id = `pipeline-${randomUUID()}`;
  if (Object.keys(input.qualificationRules || {}).some(key => !codes.includes(key))) {
    fail('Qualification rules must reference stages in this pipeline.');
  }
  return prisma.$transaction(async tx => {
    await tx.pipeline.create({ data: { id, name, qualificationRules: input.qualificationRules || {} } });
    await tx.stage.createMany({ data: supplied.map((stage, index) => ({
      id: `stg-${randomUUID()}`, pipelineId: id, name: stage.name.trim(),
      code: codes[index], order: index + 1, category: stage.category,
      color: stage.color || '#FFFFFF',
    })) });
    return tx.pipeline.findUnique({ where: { id }, include: { stages: { orderBy: { order: 'asc' } } } });
  });
}

export async function updatePipeline(id, input) {
  input = validatedInput(updatePipelineSchema, input);
  const pipeline = await prisma.pipeline.findUnique({ where: { id } });
  if (!pipeline) fail('Pipeline not found.', 404);
  const data = {};
  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80) fail('Enter a valid pipeline name.');
    data.name = input.name.trim();
  }
  if (input.qualificationRules !== undefined) {
    const rules = input.qualificationRules;
    if (!rules || typeof rules !== 'object' || Array.isArray(rules) ||
      Object.entries(rules).some(([stageCode, fields]) => !stageCode || !Array.isArray(fields) ||
        fields.some(field => !['contactId', 'companyId', 'expectedCloseDate'].includes(field)))) {
      fail('Qualification rules must list supported required fields by stage code.');
    }
    const stages = await prisma.stage.findMany({ where: { pipelineId: id }, select: { code: true } });
    const validCodes = new Set(stages.map(stage => stage.code));
    if (Object.keys(rules).some(stageCode => !validCodes.has(stageCode))) {
      fail('Qualification rules must reference stages in this pipeline.');
    }
    data.qualificationRules = rules;
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') fail('Active must be true or false.');
    if (!input.active && pipeline.id === 'pipeline-sales') fail('The default Sales pipeline must stay active.');
    if (!input.active && await prisma.deal.count({ where: { pipelineId: id,
      status: { notIn: ['Won', 'Lost'] } } })) {
      fail('Close or move open deals before deactivating this pipeline.', 409);
    }
    data.active = input.active;
  }
  return prisma.pipeline.update({ where: { id }, data, include: { stages: { orderBy: { order: 'asc' } } } });
}
