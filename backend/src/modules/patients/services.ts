import prisma from '../../infrastructure/database';
import ToolRegistry, { ToolDeclaration } from '../../ai/tools/ToolRegistry';
import logger from '../../logger';
import { broadcastEvent } from '../../infrastructure/websocket';

export class PatientsService {
  /**
   * Retrieves all patients registered under a WhatsApp number.
   */
  public static async getPatientsByWhatsApp(whatsappNumber: string) {
    return await prisma.patient.findMany({
      where: { whatsappNumber },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Registers a new patient.
   */
  public static async registerPatient(data: {
    whatsappNumber: string;
    name: string;
    age: number;
    gender: string;
  }) {
    const patient = await prisma.patient.create({
      data: {
        whatsappNumber: data.whatsappNumber,
        name: data.name,
        age: data.age,
        gender: data.gender,
      },
    });

    logger.info(`Patient registered: ${patient.name} under WhatsApp ${data.whatsappNumber}`);
    
    // Broadcast updates to dashboard and sheet simulator in real time
    broadcastEvent('dashboard:update', { type: 'PATIENT_ADDED', patient });
    broadcastEvent('sheet:sync', { sheet: 'Patients', action: 'INSERT', data: patient });

    return patient;
  }

  /**
   * Registration of Patients Tools for Gemini Agent Tool Calling
   */
  public static registerAgentTools() {
    const registry = ToolRegistry.getInstance();

    // 1. Tool Declaration: get_patients_list
    const getPatientsSchema: ToolDeclaration = {
      name: 'get_patients_list',
      description: 'Get all patients registered under a parent WhatsApp / phone number.',
      parameters: {
        type: 'OBJECT',
        properties: {
          whatsapp_number: {
            type: 'STRING',
            description: 'The WhatsApp number of the parent account.',
          },
        },
        required: ['whatsapp_number'],
      },
    };

    registry.registerTool(getPatientsSchema, async (args: any) => {
      const { whatsapp_number } = args;
      return await this.getPatientsByWhatsApp(whatsapp_number);
    });

    // 2. Tool Declaration: add_patient
    const addPatientSchema: ToolDeclaration = {
      name: 'add_patient',
      description: 'Add or register a new patient under a WhatsApp number.',
      parameters: {
        type: 'OBJECT',
        properties: {
          whatsapp_number: {
            type: 'STRING',
            description: 'The WhatsApp number of the parent account.',
          },
          name: {
            type: 'STRING',
            description: "The patient's full name.",
          },
          age: {
            type: 'INTEGER',
            description: "The patient's age in years.",
          },
          gender: {
            type: 'STRING',
            description: "The patient's gender (e.g. Male, Female, Other).",
          },
        },
        required: ['whatsapp_number', 'name', 'age', 'gender'],
      },
    };

    registry.registerTool(addPatientSchema, async (args: any) => {
      const { whatsapp_number, name, age, gender } = args;
      return await this.registerPatient({
        whatsappNumber: whatsapp_number,
        name,
        age: parseInt(age) || 25,
        gender,
      });
    });
  }
}

// Automatically register tools on script evaluation
PatientsService.registerAgentTools();

export default PatientsService;
