import { prisma } from '../backend/prisma.js';
import {
  initialBranding,
  initialUsers,
  initialStages,
  initialCompanies,
  initialContacts,
  initialLeads,
  initialDeals,
  initialTasks,
  initialNotes,
  initialActivities,
  initialStageGateChecks,
  initialAuditLogs
} from '../backend/data/initialData.js';

async function main() {
  console.log('🌱 Starting CRM database seeding into Supabase...');

  // 1. Branding
  await prisma.branding.upsert({
    where: { id: 'default' },
    update: {
      appName: initialBranding.appName,
      tagline: initialBranding.tagline,
      logoIcon: initialBranding.logoIcon,
      primaryColor: initialBranding.primaryColor,
      accentColor: initialBranding.accentColor,
      defaultRecurrenceDays: initialBranding.defaultRecurrenceDays,
      customFields: initialBranding.customFields
    },
    create: {
      id: 'default',
      appName: initialBranding.appName,
      tagline: initialBranding.tagline,
      logoIcon: initialBranding.logoIcon,
      primaryColor: initialBranding.primaryColor,
      accentColor: initialBranding.accentColor,
      defaultRecurrenceDays: initialBranding.defaultRecurrenceDays,
      customFields: initialBranding.customFields
    }
  });
  console.log('✔ Branding seeded');

  // 2. Users
  for (const u of initialUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: u,
      create: u
    });
  }
  console.log(`✔ ${initialUsers.length} Users seeded`);

  // 3. Stages
  for (const s of initialStages) {
    await prisma.stage.upsert({
      where: { id: s.id },
      update: s,
      create: s
    });
  }
  console.log(`✔ ${initialStages.length} Stages seeded`);

  // 4. Companies
  for (const c of initialCompanies) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: c,
      create: c
    });
  }
  console.log(`✔ ${initialCompanies.length} Companies seeded`);

  // 5. Contacts
  for (const cnt of initialContacts) {
    await prisma.contact.upsert({
      where: { id: cnt.id },
      update: cnt,
      create: cnt
    });
  }
  console.log(`✔ ${initialContacts.length} Contacts seeded`);

  // 6. Leads
  for (const ld of initialLeads) {
    await prisma.lead.upsert({
      where: { id: ld.id },
      update: ld,
      create: ld
    });
  }
  console.log(`✔ ${initialLeads.length} Leads seeded`);

  // 7. Deals
  for (const dl of initialDeals) {
    await prisma.deal.upsert({
      where: { id: dl.id },
      update: dl,
      create: dl
    });
  }
  console.log(`✔ ${initialDeals.length} Deals seeded`);

  // 8. Tasks
  for (const t of initialTasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: t,
      create: t
    });
  }
  console.log(`✔ ${initialTasks.length} Tasks seeded`);

  // 9. Notes
  for (const n of initialNotes) {
    await prisma.note.upsert({
      where: { id: n.id },
      update: n,
      create: n
    });
  }
  console.log(`✔ ${initialNotes.length} Notes seeded`);

  // 10. Activities
  for (const a of initialActivities) {
    await prisma.activity.upsert({
      where: { id: a.id },
      update: a,
      create: a
    });
  }
  console.log(`✔ ${initialActivities.length} Activities seeded`);

  // 11. Stage Gate Checks
  for (const sgc of initialStageGateChecks) {
    await prisma.stageGateCheck.upsert({
      where: { id: sgc.id },
      update: sgc,
      create: sgc
    });
  }
  console.log(`✔ ${initialStageGateChecks.length} Stage Gate Checks seeded`);

  // 12. Audit Logs
  for (const aud of initialAuditLogs) {
    await prisma.auditLog.upsert({
      where: { id: aud.id },
      update: aud,
      create: aud
    });
  }
  console.log(`✔ ${initialAuditLogs.length} Audit Logs seeded`);

  console.log('\n🎉 ALL CRM DATA SUCCESSFULLY SEEDED INTO SUPABASE POSTGRESQL!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
