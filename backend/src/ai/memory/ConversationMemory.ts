import prisma from '../../infrastructure/database';
import logger from '../../logger';

export interface ChatMessage {
  role: 'user' | 'model';
  message: string;
}

export class ConversationMemory {
  /**
   * Retrieves conversation history for a given WhatsApp number.
   * Formats the response specifically for Gemini API history bindings.
   */
  public static async getHistory(whatsappNumber: string, limit = 20): Promise<ChatMessage[]> {
    try {
      const records = await prisma.conversation.findMany({
        where: { whatsappNumber },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      // Reverse to get chronological order (oldest first)
      const sortedRecords = records.reverse();

      return sortedRecords.map((r) => ({
        role: r.role as 'user' | 'model',
        message: r.message,
      }));
    } catch (error) {
      logger.error(`Error loading chat history for ${whatsappNumber}:`, error);
      return [];
    }
  }

  /**
   * Persists a message to the Conversation database table.
   */
  public static async saveMessage(
    whatsappNumber: string,
    role: 'user' | 'model',
    message: string,
    patientId?: string
  ): Promise<void> {
    try {
      await prisma.conversation.create({
        data: {
          whatsappNumber,
          role,
          message,
          patientId: patientId || null,
        },
      });
      logger.debug(`Saved chat message to DB for ${whatsappNumber} [${role}]`);
    } catch (error) {
      logger.error(`Error saving message to DB for ${whatsappNumber}:`, error);
    }
  }

  /**
   * Clears conversation history.
   */
  public static async clearHistory(whatsappNumber: string): Promise<void> {
    try {
      await prisma.conversation.deleteMany({
        where: { whatsappNumber },
      });
      logger.info(`Cleared conversation history for: ${whatsappNumber}`);
    } catch (error) {
      logger.error(`Error clearing conversation history for ${whatsappNumber}:`, error);
    }
  }
}

export default ConversationMemory;
