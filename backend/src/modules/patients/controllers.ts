import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import PatientsService from './services';

const registerPatientSchema = z.object({
  whatsappNumber: z.string().min(10, 'WhatsApp number is too short'),
  name: z.string().min(2, 'Name is too short'),
  age: z.coerce.number().int().positive('Age must be a positive integer'),
  gender: z.string().min(1, 'Gender is required'),
});

export class PatientsController {
  public static async getPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const whatsappNumber = req.query.whatsappNumber as string;
      if (!whatsappNumber) {
        return res.status(400).json({ success: false, message: 'whatsappNumber is required' });
      }

      const patients = await PatientsService.getPatientsByWhatsApp(whatsappNumber);
      res.status(200).json({ success: true, patients });
    } catch (error) {
      next(error);
    }
  }

  public static async registerPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerPatientSchema.parse(req.body);
      const patient = await PatientsService.registerPatient(validatedData);

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully.',
        patient,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default PatientsController;
