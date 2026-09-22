/**
 * Backward-compatibility facade for crmStore
 * All logic has been modularized into domain services under backend/services/
 * Reads and writes communicate directly with PostgreSQL via Prisma ORM.
 */
import * as systemService from '../services/systemService.js';
import * as companyService from '../services/companyService.js';
import * as contactService from '../services/contactService.js';
import * as leadService from '../services/leadService.js';
import * as stageService from '../services/stageService.js';
import * as dealService from '../services/dealService.js';
import * as taskService from '../services/taskService.js';
import * as activityNoteService from '../services/activityNoteService.js';
import * as userService from '../services/userService.js';
import * as stageGateService from '../services/stageGateService.js';

export const crmStore = {
  ...systemService,
  ...companyService,
  ...contactService,
  ...leadService,
  ...stageService,
  ...dealService,
  ...taskService,
  ...activityNoteService,
  ...userService,
  ...stageGateService,
};
