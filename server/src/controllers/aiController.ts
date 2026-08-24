import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import aiIncidentParserService from '../services/aiIncidentParserService.js'
import aiOrderParserService from '../services/aiOrderParserService.js'

type AnalyzeOrderBody = {
  text: string
}

export const analyzeOrderController = asyncHandler(
  async (req: Request<unknown, unknown, AnalyzeOrderBody>, res: Response) => {
    const result = await aiOrderParserService.analyzeOrderTextService(req.body.text.trim())

    return res.status(200).json(new SuccessResponse('Đã phân tích yêu cầu đơn hàng.', result))
  }
)

export const analyzeIncidentController = asyncHandler(
  async (req: Request<unknown, unknown, AnalyzeOrderBody>, res: Response) => {
    const result = await aiIncidentParserService.analyzeIncidentTextService(req.body.text.trim())

    return res.status(200).json(new SuccessResponse('Đã phân tích mô tả sự cố.', result))
  }
)

export default {
  analyzeIncidentController,
  analyzeOrderController
}
